/**
 * Tavily search service - phase 4 §2.10 company research.
 *
 * Free tier: 1000 searches/month, no card. Endpoint:
 *   POST https://api.tavily.com/search
 *   body: { api_key, query, max_results, search_depth, include_raw_content }
 *
 * Returns an array of results with title/url/content. The api route
 * uses this to gather company info, then feeds the content into gemini
 * for structured summarization.
 */
import type { ResearchSource } from "@resume-builder/shared";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

interface TavilyRequest {
  api_key: string;
  query: string;
  max_results?: number;
  search_depth?: "basic" | "advanced";
  include_raw_content?: boolean;
  topic?: "general" | "news";
}

interface TavilyResponse {
  results?: {
    title?: string;
    url?: string;
    content?: string;
    raw_content?: string;
  }[];
  answer?: string;
}

export async function tavilySearch(args: {
  query: string;
  apiKey: string;
  maxResults?: number;
  news?: boolean;
}): Promise<ResearchSource[]> {
  const req: TavilyRequest = {
    api_key: args.apiKey,
    query: args.query,
    max_results: args.maxResults ?? 5,
    search_depth: "advanced",
    include_raw_content: false,
    topic: args.news ? "news" : "general",
  };
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`tavily ${res.status}: ${body.slice(0, 300)}`);
  }
  const body = (await res.json()) as TavilyResponse;
  const results = body.results ?? [];
  return results.slice(0, args.maxResults ?? 5).map((r, i) => ({
    url: r.url ?? `unknown-${i}`,
    title: r.title ?? "(no title)",
    excerpt: (r.content ?? "").slice(0, 600),
  }));
}

/**
 * Run multiple searches and concatenate results. Used to gather
 * general company info + recent news + jd alignment cues.
 */
export async function tavilyMultiSearch(args: {
  companyName: string;
  jdText?: string;
  apiKey: string;
}): Promise<ResearchSource[]> {
  const queries = [
    `${args.companyName} company overview mission`,
    `${args.companyName} culture values work environment`,
  ];
  if (args.jdText) {
    queries.push(`${args.companyName} ${extractJdKeyword(args.jdText)}`);
  }
  const batches = await Promise.all(
    queries.map((q) => tavilySearch({ query: q, apiKey: args.apiKey, maxResults: 4 })),
  );
  // Dedupe by url, keep first occurrence.
  const seen = new Set<string>();
  const out: ResearchSource[] = [];
  for (const batch of batches) {
    for (const s of batch) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
  }
  return out;
}

/** Crude jd keyword extraction for the tavily query. We want a
 *  domain-specific term that, combined with the company name,
 *  returns relevant search hits. Strip noise and pick the most
 *  "noun-like" word (heuristic: longest non-stop-word token). */
function extractJdKeyword(jdText: string): string {
  const STOP = new Set([
    "with", "from", "your", "will", "have", "this", "that", "they",
    "their", "them", "have", "role", "team", "company", "position",
    "work", "experience", "skills", "looking", "must", "should",
    "responsibilities", "requirements", "eligibility", "apply",
    "about", "description", "summary",
  ]);
  const words = jdText
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.\-]{2,}/g) ?? [];
  const candidates = words
    .filter((w) => !STOP.has(w) && w.length >= 4)
    .sort((a, b) => b.length - a.length);
  return candidates[0] ?? "industry";
}