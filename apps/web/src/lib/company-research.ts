/**
 * Company research orchestrator - phase 4 §2.10.
 *
 * Pipeline:
 *   1. tavily multi-search for company overview + culture + jd-aligned
 *   2. gemini flash reads the raw sources and produces structured
 *      CompanyResearch (summary, values, recentNews, jdAlignment).
 *
 * Falls back gracefully: if gemini fails to parse the structured
 * output, we still return the tavily sources so the user can read
 * them directly.
 */
import type {
  CompanyResearch,
  ResearchSource,
} from "@resume-builder/shared";
import { tavilyMultiSearch } from "./tavily-service";

interface SummarizeResult {
  companyName: string;
  summary: string;
  values: string[];
  recentNews: string[];
  jdAlignment: string[];
}

interface SummarizeResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

const SUMMARY_PROMPT = `You are helping a job-seeker tailor their resume to a specific company.

Given these sources about {COMPANY}, produce a structured JSON summary.

ANTI-HALLUCINATION RULES:
1. Every claim must be traceable to one of the provided sources.
2. If a source says nothing about a topic, omit that bullet.
3. Do not invent funding rounds, employee counts, or product names.
4. Use cautious language ("appears to", "according to") when uncertain.

OUTPUT FORMAT (strict JSON, no prose, no markdown fences):
{
  "companyName": "<resolved canonical name, e.g. 'FinIdeas'>",
  "summary": "<2-3 paragraph prose suitable for a resume's \\\\section{SUMMARY} block. Mention company mission + size/positioning + what makes them distinctive.>",
  "values": ["<3-6 short bullet strings capturing company values, culture, what they look for in hires.>"],
  "recentNews": ["<3-5 short bullets about recent initiatives, product launches, hiring news.>"],
  "jdAlignment": [<only if jd was supplied> "<3-6 short bullets matching jd requirements to company profile.>"]
}

JOB DESCRIPTION (optional, only for jdAlignment):
{JD}

SOURCES:
{SOURCES}

Return only the JSON object, no markdown fences.`;

export async function researchCompany(args: {
  companyName: string;
  jdText?: string;
  tavilyKey: string;
  geminiKey: string;
  geminiModel: string;
}): Promise<CompanyResearch> {
  const sources = await tavilyMultiSearch({
    companyName: args.companyName,
    jdText: args.jdText,
    apiKey: args.tavilyKey,
  });

  if (sources.length === 0) {
    throw new Error(
      `tavily returned no results for "${args.companyName}". try a different spelling.`,
    );
  }

  // Build the prompt from sources.
  const sourcesText = sources
    .map(
      (s: ResearchSource, i: number) =>
        `[${i + 1}] ${s.title}\n${s.url}\n${s.excerpt}`,
    )
    .join("\n\n");

  const prompt = SUMMARY_PROMPT.replace("{COMPANY}", args.companyName)
    .replace("{JD}", args.jdText ?? "(no jd supplied)")
    .replace("{SOURCES}", sourcesText);

  // Call gemini directly with the summary prompt.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.geminiModel}:generateContent`;
  const req = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": args.geminiKey,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`gemini summarize ${res.status}: ${body.slice(0, 300)}`);
  }
  const body = (await res.json()) as SummarizeResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: SummarizeResult;
  try {
    parsed = JSON.parse(cleaned) as SummarizeResult;
  } catch {
    // Fallback: return raw sources so the user can read them.
    return {
      companyName: args.companyName,
      summary:
        "Could not parse structured summary from the model. See sources below.",
      values: [],
      recentNews: [],
      jdAlignment: [],
      sources,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    companyName: parsed.companyName ?? args.companyName,
    summary: parsed.summary ?? "",
    values: Array.isArray(parsed.values) ? parsed.values : [],
    recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews : [],
    jdAlignment: Array.isArray(parsed.jdAlignment) ? parsed.jdAlignment : [],
    sources,
    generatedAt: new Date().toISOString(),
  };
}