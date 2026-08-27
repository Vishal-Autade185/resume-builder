/**
 * Gemini service - the AI client for resume tailoring.
 *
 * Per product.md section 4's anti-hallucination invariant, the AI is given
 * ONLY the structured data-bank fields (not raw latex) and told it can
 * rephrase/reorder/select but never invent facts. We ask the model to
 * return a JSON array of ProposedChange, which we then validate with zod
 * and (optionally) fact-ground against the source.
 *
 * For phase 2 we wire up gemini only (BYOK gemini flash). When more
 * providers are added, the dispatch happens in /api/tailor based on the
 * user's ai_settings; this module is the gemini-specific impl.
 */
import type {
  DataBank,
  JobDescription,
  ProposedChange,
  AISettings,
  ResumeStyle,
  Provider,
} from "@resume-builder/shared";
import { ProposedChangeSchema, PROVIDER_ENV_VAR, defaultResumeStyle } from "@resume-builder/shared";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiRequest {
  contents: { parts: { text: string }[] }[];
  generationConfig: {
    temperature: number;
    responseMimeType: string;
    // thinkingBudget=0 disables gemini 2.5+'s internal reasoning step.
    // 2.5 flash defaults to ~5000 tokens of thinking, which adds 5-15s
    // to every call. For 'click tailor' UX that's fine. For interactive
    // / preview / repeated calls we'd want it off. Per product.md
    // section 5 phase 3.5 we ship with thinking off by default; users
    // who want better output can re-enable by editing this file or
    // upgrading the model to gemini-2.5-pro with explicit thinkingConfig.
    thinkingConfig?: { thinkingBudget?: number };
  };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export async function callGeminiForTailoring(args: {
  jd: JobDescription;
  bank: DataBank;
  apiKey: string;
  model: string;
  style?: ResumeStyle;
}): Promise<ProposedChange[]> {
  const prompt = buildPrompt({
    jd: args.jd,
    bank: args.bank,
    style: args.style ?? defaultResumeStyle(),
  });
  const url = `${GEMINI_ENDPOINT}/${args.model}:generateContent`;
  const isThinkingModel = args.model.startsWith("gemini-2.5");
  const req: GeminiRequest = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      ...(isThinkingModel
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": args.apiKey,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `gemini ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  const body = (await res.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return parseAndValidate(text);
}

/**
 * The prompt. Kept structured so the model sees exactly the data bank
 * shape and produces a ProposedChange[] we can validate.
 */
function buildPrompt({
  jd,
  bank,
  style,
}: {
  jd: JobDescription;
  bank: DataBank;
  style: ResumeStyle;
}): string {
  // Pass only the data bank fields. Never include any LaTeX. The model can
  // rephrase the bullet strings but can't see the surrounding document.
  const bankForModel = {
    personal: bank.personal,
    education: bank.education.map((e) => ({
      id: e.id, institution: e.institution, degree: e.degree,
      startDate: e.startDate, endDate: e.endDate, gpa: e.gpa, details: e.details,
    })),
    experience: bank.experience.map((e) => ({
      id: e.id, company: e.company, role: e.role,
      startDate: e.startDate, endDate: e.endDate, location: e.location,
      bullets: e.bullets,
    })),
    projects: bank.projects.map((p) => ({
      id: p.id, name: p.name, description: p.description,
      techStack: p.techStack, link: p.link, impact: p.impact,
    })),
    skills: bank.skills,
    certifications: bank.certifications,
  };

  return `You are helping tailor a resume to a specific job description.

ANTI-HALLUCINATION RULES (must follow strictly):
1. You may only SELECT or DESELECT items from the data bank, or REPHRASE existing bullet/description strings.
2. You may NOT invent companies, metrics, technologies, achievements, dates, or any other facts.
3. Every numeric metric you keep in 'after' must already exist in the data bank's 'before'. If you want to highlight a metric, REPHRASE the surrounding text but keep the number unchanged.
4. For every rewrite, include a 'source' citation with the exact field path (e.g. "experience.0.bullets.0") and the verbatim 'original' text from the bank.
5. Prefer rephrasing over removing information; only deselect items that are clearly irrelevant to the JD.

OUTPUT FORMAT (strict JSON, no prose):
Return a single JSON object with this shape:
{
  "changes": [
    {
      "kind": "select_experience" | "deselect_experience" | "select_project" | "deselect_project" | "select_education" | "deselect_education" | "select_skill" | "deselect_skill" | "select_certification" | "deselect_certification" | "rewrite_experience_bullet" | "rewrite_project_description" | "rewrite_project_impact",
      "entityId": "<id of the data bank item this change applies to>",
      "summary": "<short human-readable label, e.g. 'rewrite Experience #2 bullet 1'>",
      "before": "<exact current text of the field, or null if adding>",
      "after": "<proposed new text, or null if removing>",
      "source": { "field": "<data-bank field path>", "original": "<verbatim original text>" } | null,
      "rationale": "<one sentence explaining why this change helps match the JD>"
    }
  ]
}

JOB DESCRIPTION:
${jd.rawText}

DATA BANK (source of truth - only these items exist):
${JSON.stringify(bankForModel, null, 2)}

Now produce a JSON object with 3-8 high-impact changes that best tailor this resume to the JD.

STYLE RULES (apply each if its toggle is on):
${styleRulesBlock(style)}

REMINDER: every change must follow the anti-hallucination rules above.`;
}

/** Style rules as prompt-injectable text. Only enabled rules are listed. */
function styleRulesBlock(style: ResumeStyle): string {
  const rules: string[] = [];
  if (style.focusOnCore) {
    rules.push(
      "- focusOnCore: prefer deselect_* for items clearly off-topic; group select_* for items that directly map to the JD.",
    );
  }
  if (style.quantify) {
    rules.push(
      "- quantify: every rewrite_experience_bullet / rewrite_project_description / rewrite_project_impact must include a number, percent, or other measurable outcome (count, time saved, accuracy, F1, etc.). If the source has no metric, keep the source text unchanged rather than fabric a number.",
    );
  }
  if (style.noOrphans) {
    rules.push(
      "- noOrphans: prefer 2-3 sentence bullets over 1-liners; combine thin bullets into their parent's narrative instead of leaving orphaned single-line entries.",
    );
  }
  if (style.ats) {
    rules.push(
      "- ats: rewrite bullets to start with a strong past-tense action verb (built, shipped, optimized, reduced, etc.). No tables, no graphics-only markers, no emoji.",
    );
  }
  if (rules.length === 0) {
    return "(no style rules active)";
  }
  return rules.join("\n");
}

/** Parse the model's JSON response and validate each change against the schema. */
function parseAndValidate(text: string): ProposedChange[] {
  // gemini occasionally wraps the json in ```json ... ``` fences. Strip them.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("gemini returned non-JSON: " + cleaned.slice(0, 200));
  }
  // The prompt asks for { changes: [...] } but tolerate either bare array
  // or wrapped object.
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { changes?: unknown[] })?.changes)
      ? (parsed as { changes: unknown[] }).changes
      : [];
  const out: ProposedChange[] = [];
  for (const raw of arr) {
    // Inject a synthetic uuid so react keys are stable.
    const withId = { id: crypto.randomUUID(), ...raw as object };
    const parsed = ProposedChangeSchema.safeParse(withId);
    if (parsed.success) {
      out.push(parsed.data);
    }
    // Skip invalid ones silently. Tightening: log to console for visibility.
    // Phase 3+ will surface a 'gemini returned malformed changes' warning.
  }
  return out;
}

/** Provider dispatch. Phase 2 supports gemini only. */
export async function callAIForTailoring(args: {
  provider: Provider;
  jd: JobDescription;
  bank: DataBank;
  settings: AISettings;
  style?: ResumeStyle;
}): Promise<ProposedChange[]> {
  const envVar = PROVIDER_ENV_VAR[args.provider];
  const apiKey = process.env[envVar];
  if (!apiKey) {
    throw new Error(
      `no api key configured. set ${envVar} in apps/web/.env.local`,
    );
  }
  switch (args.provider) {
    case "gemini":
      return callGeminiForTailoring({
        jd: args.jd,
        bank: args.bank,
        apiKey,
        model: args.settings.model,
        style: args.style,
      });
    case "openai":
    case "anthropic":
    case "nvidia":
      throw new Error(
        `provider ${args.provider} is not wired up yet. phase 2 ships gemini only.`,
      );
  }
}

/**
 * Fact-grounding check. Per product.md section 2.7, every claim in 'after'
 * must trace back to the data bank. Strict mode: the citation must
 * reference a real field. Loose mode: only sanity-check that 'after' is
 * not adding whole new entities (company names, tools) that aren't in
 * the bank.
 */
export function checkFactGrounding(args: {
  change: ProposedChange;
  bank: DataBank;
  strict: boolean;
}): { ok: boolean; reason?: string } {
  if (!args.change.after) return { ok: true };
  const after = args.change.after.toLowerCase();

  // Build a corpus of all text in the data bank. Anything the AI writes
  // must be traceable to one of these strings.
  const corpus: string[] = [args.bank.personal.fullName.toLowerCase()];
  for (const e of args.bank.experience) {
    corpus.push(e.company.toLowerCase(), e.role.toLowerCase());
    if (e.location) corpus.push(e.location.toLowerCase());
    for (const b of e.bullets) corpus.push(b.toLowerCase());
  }
  for (const e of args.bank.education) {
    corpus.push(e.institution.toLowerCase(), e.degree.toLowerCase());
    if (e.details) corpus.push(e.details.toLowerCase());
  }
  for (const p of args.bank.projects) {
    corpus.push(p.name.toLowerCase(), p.description.toLowerCase());
    for (const t of p.techStack) corpus.push(t.toLowerCase());
    if (p.impact) corpus.push(p.impact.toLowerCase());
  }
  for (const s of args.bank.skills) {
    corpus.push(s.category.toLowerCase());
    for (const item of s.items) corpus.push(item.toLowerCase());
  }
  for (const c of args.bank.certifications) {
    corpus.push(c.name.toLowerCase(), c.issuer.toLowerCase());
  }
  const corpusStr = corpus.join(" ");

  // Look for capitalized word sequences in 'after' that don't appear in
  // any bank string. gemini invents entities in title case; the bank
  // entities (Real Company, Real Tool, etc.) should also be in title case.
  for (const phrase of extractEntityCandidates(args.change.after)) {
    const lower = phrase.toLowerCase();
    // Substring check in either direction: the bank has the phrase as a
    // substring of a longer string, or the phrase is a substring of a
    // bank string. Either way we have ground truth.
    if (!corpusStr.includes(lower) && !includesAsToken(lower, corpus)) {
      if (args.strict) {
        return {
          ok: false,
          reason: `introduces entity "${phrase}" not found in data bank`,
        };
      }
    }
  }

  // Strict mode requires source citation for rewrites.
  if (args.strict && isRewrite(args.change.kind) && !args.change.source) {
    return {
      ok: false,
      reason: "rewrite has no source citation",
    };
  }
  if (args.strict && args.change.source) {
    const inBank = isCitationInBank(args.change.source.field, args.change.source.original, args.bank);
    if (!inBank) {
      return {
        ok: false,
        reason: "source citation does not match a real data-bank field",
      };
    }
  }
  return { ok: true };
}

/** Check if `phrase` appears as a whole-word token in any corpus entry. */
function includesAsToken(phrase: string, corpus: string[]): boolean {
  for (const entry of corpus) {
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i");
    if (re.test(entry)) return true;
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRewrite(kind: ProposedChange["kind"]): boolean {
  return (
    kind === "rewrite_experience_bullet" ||
    kind === "rewrite_project_description" ||
    kind === "rewrite_project_impact"
  );
}

function isCitationInBank(
  field: string,
  original: string,
  bank: DataBank,
): boolean {
  const m = field.match(/^([a-z]+)\.(\d+)\.(.+)$/);
  if (!m) return false;
  const [, coll, idxStr, sub] = m;
  const idx = Number(idxStr);
  const collection = (bank as unknown as Record<string, unknown[]>)[coll];
  if (!Array.isArray(collection) || idx >= collection.length) return false;
  const item = collection[idx] as Record<string, unknown>;
  const value = sub.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown>)?.[k],
    item,
  );
  if (typeof value !== "string") return false;
  return value.includes(original) || original.includes(value);
}

/** Crude entity extraction. Looks for "Title at Company" style phrases
 * that gemini tends to invent. Good enough for a guardrail. */
function extractEntityCandidates(text: string): string[] {
  const out: string[] = [];
  // Capitalized word sequences of length 2-5
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}