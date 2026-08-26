/**
 * POST /api/tailor - run ai tailoring on the current data bank against
 * a stored job description.
 *
 * Body: { jdId: string }
 * Response: { changes: ProposedChange[], warnings: string[] }
 *
 * The handler:
 *   1. reads ai_settings (provider, model, factGrounding)
 *   2. reads the jd by id
 *   3. reads the current data bank
 *   4. calls the AI service (gemini-only in phase 2)
 *   5. runs fact-grounding check on each change per settings.factGrounding
 *   6. returns the changes + any warnings (rejected changes surface here)
 */
import { NextResponse } from "next/server";
import type { DataBank, JobDescription } from "@resume-builder/shared";
import { defaultAISettings } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";
import {
  callAIForTailoring,
  checkFactGrounding,
} from "@/lib/gemini-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jdId = typeof body?.jdId === "string" ? body.jdId : "";
  if (!jdId) {
    return NextResponse.json({ error: "jdId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. settings
  const { data: settingsRow } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  const settings = settingsRow
    ? {
        provider: settingsRow.provider as "gemini" | "openai" | "anthropic" | "nvidia",
        model: settingsRow.model,
        factGrounding: settingsRow.fact_grounding as "tight" | "loose",
        tier: settingsRow.tier as "cheap" | "strong",
      }
    : defaultAISettings();

  // 2. jd
  const { data: jdRow, error: jdErr } = await supabase
    .from("job_descriptions")
    .select("*")
    .eq("id", jdId)
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (jdErr) {
    return NextResponse.json({ error: jdErr.message }, { status: 500 });
  }
  if (!jdRow) {
    return NextResponse.json({ error: "jd not found" }, { status: 404 });
  }
  const jd: JobDescription = {
    id: jdRow.id,
    rawText: jdRow.raw_text,
    source: jdRow.source,
    sourceName: jdRow.source_name,
    warnings: jdRow.warnings ?? [],
    createdAt: jdRow.created_at,
  };

  // 3. data bank
  const { data: bankRow, error: bankErr } = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (bankErr) {
    return NextResponse.json({ error: bankErr.message }, { status: 500 });
  }
  if (!bankRow) {
    return NextResponse.json(
      { error: "no data bank - fill out the data bank first" },
      { status: 400 },
    );
  }
  const { id: _id, user_id: _u, created_at: _ca, updated_at: _ua, ...bank } = bankRow;
  const dataBank = bank as unknown as DataBank;

  // 4. call ai
  let rawChanges;
  try {
    rawChanges = await callAIForTailoring({
      provider: settings.provider,
      jd,
      bank: dataBank,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "ai call failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }

  // 5. fact-grounding check. Tight mode rejects changes that don't pass;
  //    loose mode keeps them but emits a warning.
  const accepted = [];
  const rejected = [];
  const warnings: string[] = [];
  for (const change of rawChanges) {
    const result = checkFactGrounding({
      change,
      bank: dataBank,
      strict: settings.factGrounding === "tight",
    });
    if (result.ok) {
      accepted.push(change);
    } else {
      if (settings.factGrounding === "tight") {
        rejected.push({ change, reason: result.reason ?? "unknown" });
      } else {
        // loose: keep but warn
        accepted.push(change);
        if (result.reason) warnings.push(`${change.summary}: ${result.reason}`);
      }
    }
  }

  return NextResponse.json({
    changes: accepted,
    rejected,
    warnings,
  });
}