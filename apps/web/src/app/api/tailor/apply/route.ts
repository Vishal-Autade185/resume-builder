/**
 * POST /api/tailor/apply - apply a set of AI-proposed changes to the data
 * bank. The client passes only the changes the user accepted (rejected
 * ones never reach here).
 *
 * Body: { accepted: ProposedChange[] }
 * Response: { ok: true, applied: number }
 *
 * Each accepted change is applied:
 *   - select_* / deselect_* -> stored as a new resume_version with the
 *     resulting selection
 *   - rewrite_experience_bullet / rewrite_project_description /
 *     rewrite_project_impact -> applied directly to the bank content
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type {
  DataBank,
  ProposedChange,
  ResumeStyle,
  Selection,
} from "@resume-builder/shared";
import { emptyDataBank, defaultResumeStyle } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";
import { renderDataBankToLatex } from "@/lib/render-latex";
import { countPdfPages } from "@/lib/count-pages";

const USER_ID = "00000000-0000-0000-0000-000000000000";

type Accepted = ProposedChange & { status: "accepted" };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const accepted = (body?.accepted ?? []) as Accepted[];
  if (!Array.isArray(accepted) || accepted.length === 0) {
    return NextResponse.json(
      { error: "accepted must be a non-empty array" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Load style toggles so we can validate accepted rewrites against them.
  const { data: styleRow } = await supabase
    .from("resume_style_settings")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  const style: ResumeStyle = styleRow
    ? {
        focusOnCore: styleRow.focus_on_core,
        quantify: styleRow.quantify,
        noOrphans: styleRow.no_orphans,
        ats: styleRow.ats,
      }
    : defaultResumeStyle();

  const { data: bankRow, error: bankErr } = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (bankErr) {
    return NextResponse.json({ error: bankErr.message }, { status: 500 });
  }
  const bank: DataBank = bankRow ? rowToBank(bankRow) : emptyDataBank();

  let applied = 0;
  const rewritten: Accepted[] = [];
  const styleWarnings: string[] = [];

  for (const change of accepted) {
    if (change.kind.startsWith("select_") || change.kind.startsWith("deselect_")) {
      // Selection changes don't mutate the bank; we persist them on the
      // version snapshot we save below.
      applied++;
      continue;
    }
    if (!change.entityId || change.before == null || change.after == null) continue;

    // Style validation before applying. Returns warnings for soft
    // violations; returns false to skip this rewrite entirely on hard
    // violations (currently: quantify dropping a metric).
    const validation = validateAgainstStyle(change, style);
    if (!validation.ok) {
      styleWarnings.push(`${change.summary}: ${validation.reason}`);
      continue;
    }
    if (validation.warning) {
      styleWarnings.push(`${change.summary}: ${validation.warning}`);
    }

    if (change.kind === "rewrite_experience_bullet") {
      const exp = bank.experience.find((e) => e.id === change.entityId);
      if (exp) {
        const idx = exp.bullets.indexOf(change.before);
        if (idx >= 0) {
          exp.bullets[idx] = change.after;
          rewritten.push(change);
          applied++;
        }
      }
    } else if (change.kind === "rewrite_project_description") {
      const proj = bank.projects.find((p) => p.id === change.entityId);
      if (proj && proj.description === change.before) {
        proj.description = change.after;
        rewritten.push(change);
        applied++;
      }
    } else if (change.kind === "rewrite_project_impact") {
      const proj = bank.projects.find((p) => p.id === change.entityId);
      if (proj && proj.impact === change.before) {
        proj.impact = change.after;
        rewritten.push(change);
        applied++;
      }
    }
  }

  // Compute the selection that the user chose via select_*/deselect_*.
  const selected: Record<string, string[]> = {};
  const deselected: Record<string, string[]> = {};
  for (const change of accepted) {
    if (!change.entityId) continue;
    const coll = collectionForKind(change.kind);
    if (!coll) continue;
    const isSelect = change.kind.startsWith("select_");
    const bucket = (isSelect ? selected : deselected)[coll] ?? [];
    bucket.push(change.entityId);
    (isSelect ? selected : deselected)[coll] = bucket;
  }

  // Persist rewritten changes back to data_bank.
  if (rewritten.length > 0) {
    const { error: writeErr } = await supabase
      .from("data_bank")
      .upsert(
        {
          user_id: USER_ID,
          personal: bank.personal,
          education: bank.education,
          experience: bank.experience,
          projects: bank.projects,
          skills: bank.skills,
          certifications: bank.certifications,
          publications: bank.publications,
          achievements: bank.achievements,
        },
        { onConflict: "user_id" },
      );
    if (writeErr) {
      return NextResponse.json(
        { error: "failed to save rewrites: " + writeErr.message },
        { status: 500 },
      );
    }
  }

  // If any selection changes, persist a new resume_version capturing
  // the resulting selection + the (post-rewrite) bank. We re-compile
  // and store a PDF so the user can re-load this version later.
  if (Object.keys(selected).length > 0 || Object.keys(deselected).length > 0) {
    const selection: Selection = {};
    for (const [k, ids] of Object.entries(selected)) {
      if (ids === undefined) continue;
      const deselectSet = new Set(deselected[k] ?? []);
      const all = collectionIds(bank, k as keyof DataBank);
      const keep = all.filter((id) => !deselectSet.has(id));
      if (k === "education") selection.education = keep;
      else if (k === "experience") selection.experience = keep;
      else if (k === "projects") selection.projects = keep;
      else if (k === "skills") selection.skills = keep;
      else if (k === "certifications") selection.certifications = keep;
      else if (k === "publications") selection.publications = keep;
      else if (k === "achievements") selection.achievements = keep;
    }

    // Snapshot current style settings so the version can re-apply them
    // later (style_settings jsonb column on resume_versions).
    const { data: styleRow } = await supabase
      .from("resume_style_settings")
      .select("*")
      .eq("user_id", USER_ID)
      .maybeSingle();
    const styleSnapshot = styleRow
      ? {
          focusOnCore: styleRow.focus_on_core,
          quantify: styleRow.quantify,
          noOrphans: styleRow.no_orphans,
          ats: styleRow.ats,
        }
      : {};

    const id = randomUUID();
    const versionInsert = await supabase.from("resume_versions").insert({
      id,
      user_id: USER_ID,
      label: `AI-tailored ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      data_bank_snapshot: bank,
      selection,
      template_id: null,
      style_settings: styleSnapshot,
      pdf_storage_path: null,
    });
    if (versionInsert.error) {
      return NextResponse.json(
        { error: "failed to save version: " + versionInsert.error.message },
        { status: 500 },
      );
    }

    // Render + upload the PDF. Non-fatal on failure: version is persisted
    // without a pdf, user can re-tailor to regenerate.
    try {
      // For AI-tailored versions we use the built-in article renderer
      // (which is template-agnostic). For template-aware AI tailoring,
      // use /api/versions with templateId set after the rewrite loop.
      const tex = renderDataBankToLatex(bank, { selection });
      const compilerUrl = process.env.NEXT_PUBLIC_COMPILER_URL ?? "http://localhost:4000";
      const compileRes = await fetch(`${compilerUrl}/compile`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tex, mainFile: "main.tex" }),
      });
      if (compileRes.ok) {
        const body = (await compileRes.json()) as { pdf: string };
        const pdfBytes = Buffer.from(body.pdf, "base64");
        const storagePath = `${USER_ID}/${id}.pdf`;
        const up = await supabase.storage
          .from("pdfs")
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
        if (!up.error) {
          // Count pages so the versions dropdown can render a page badge
          // and the future overflow enforcement has something to check.
          const pageCount = await countPdfPages(pdfBytes);
          const update: Record<string, unknown> = { pdf_storage_path: storagePath };
          if (pageCount !== null) update.page_count = pageCount;
          await supabase
            .from("resume_versions")
            .update(update)
            .eq("id", id);
        }
      }
    } catch {
      // swallow - version is still saved without pdf
    }
  }

  return NextResponse.json({ ok: true, applied, warnings: styleWarnings });
}

function rowToBank(row: Record<string, unknown>): DataBank {
  const { user_id: _u, created_at: _ca, updated_at: _ua, id: _id, ...rest } = row;
  return rest as unknown as DataBank;
}

function collectionForKind(kind: ProposedChange["kind"]): string | null {
  if (kind === "select_education" || kind === "deselect_education") return "education";
  if (kind === "select_experience" || kind === "deselect_experience") return "experience";
  if (kind === "select_project" || kind === "deselect_project") return "projects";
  if (kind === "select_skill" || kind === "deselect_skill") return "skills";
  if (kind === "select_certification" || kind === "deselect_certification") return "certifications";
  return null;
}

function collectionIds(bank: DataBank, k: keyof DataBank): string[] {
  const coll = bank[k];
  if (!Array.isArray(coll)) return [];
  return coll
    .map((item) => (item as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");
}
/**
 * Validate an accepted rewrite against the user's style rules.
 *
 * Hard violations (returns ok:false) reject the rewrite:
 *   - quantify: true + rewrite dropped a number/percent from the source
 *
 * Soft violations (returns ok:true + warning) emit a warning to the
 * user but still apply the change:
 *   - ats: true + rewrite doesn't start with a known action verb
 *   - the warning shows up in the apply response so the user sees it
 *     in the toast and can manually edit later if they want
 */
function validateAgainstStyle(
  change: Accepted,
  style: ResumeStyle,
): { ok: boolean; reason?: string; warning?: string } {
  const before = change.before ?? "";
  const after = change.after ?? "";

  // quantify: source had a metric (number/percent) and the rewrite dropped it
  if (style.quantify && hasMetric(before) && !hasMetric(after)) {
    return {
      ok: false,
      reason: "quantify: rewrite dropped a metric from the source",
    };
  }

  // ats: rewrite doesn't start with a known action verb (soft warning)
  if (style.ats && !startsWithActionVerb(after)) {
    return {
      ok: true,
      warning:
        "ats: rewrite doesn't start with a strong action verb (consider: built, shipped, optimized, reduced, designed, ...)",
    };
  }

  return { ok: true };
}

function hasMetric(s: string): boolean {
  return /(\d+(\.\d+)?%|\$\d+|\b\d+(\.\d+)?\b)/.test(s);
}

const ACTION_VERBS = new Set([
  "built", "shipped", "designed", "implemented", "deployed", "optimized",
  "reduced", "increased", "cut", "created", "developed", "launched",
  "led", "managed", "authored", "engineered", "trained", "tuned",
  "migrated", "refactored", "automated", "streamlined", "accelerated",
  "pioneered", "founded", "spearheaded", "orchestrated", "delivered",
  "architected", "integrated", "enabled", "drove", "produced", "cut",
  "fine-tuned", "validated", "evaluated", "wrote", "ran", "cut",
  "achieved", "cut",
]);

function startsWithActionVerb(s: string): boolean {
  const first = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[.,;:!?]$/, "") ?? "";
  return ACTION_VERBS.has(first);
}
