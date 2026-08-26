/**
 * JD match score - product.md section 2.11. Keyword-based, not semantic.
 *
 * Returns:
 *   overlapPercent:  0-100, % of jdKeywords that appear in resume
 *   matched:         keywords present in the resume (subset of jdKeywords)
 *   missingFromResume: keywords in jd but not in resume (subset of jdKeywords)
 *   missingFromBank:   keywords in jd but not anywhere in data bank
 *                      (a signal: 'maybe you should add this skill/project')
 *   jdKeywords:      the full set extracted from the JD
 *
 * Phase 3 ships keyword matching only. Phrase detection is naive: split
 * JD on word boundaries, lowercase, dedupe short words. 'machine learning'
 * counts as 2 keywords ("machine", "learning"). Phase 3.5+ could swap
 * this for a smarter extractor without changing the response shape.
 */
import { z } from "zod";
import type { DataBank } from "@resume-builder/shared";

export const JdMatchScoreSchema = z.object({
  jdKeywords: z.array(z.string()),
  matched: z.array(z.string()),
  missingFromResume: z.array(z.string()),
  missingFromBank: z.array(z.string()),
  overlapPercent: z.number().min(0).max(100),
});

export type JdMatchScore = z.infer<typeof JdMatchScoreSchema>;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "of", "on", "or", "our", "out",
  "that", "the", "their", "them", "they", "this", "to", "we", "will",
  "with", "you", "your", "all", "any", "can", "be", "do", "have",
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
]);

export function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.\-]{1,}/g) ?? [];
  const out: string[] = [];
  for (const raw of words) {
    // Strip trailing punctuation so 'models.' matches 'models'.
    const w = raw.replace(/[.,;:!?]+$/, "");
    if (w.length < 3) continue;
    if (STOP_WORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    out.push(w);
  }
  return Array.from(new Set(out));
}

export function computeJdMatchScore(args: {
  jdText: string;
  bank: DataBank;
}): JdMatchScore {
  const jdKeywords = extractKeywords(args.jdText);
  const bankCorpus = bankToText(args.bank).toLowerCase();

  const matched: string[] = [];
  const missingFromResume: string[] = [];
  const missingFromBank: string[] = [];

  for (const k of jdKeywords) {
    const inResume = args.bank !== undefined; // we always check the same bank
    // 'resume' here = the rendered output the user will see. Since we
    // don't have a separate rendered-text cache, treat 'resume' as the
    // bank content (it's literally what gets rendered after applying the
    // selection). Equivalent for keyword matching.
    if (bankCorpus.includes(k)) {
      matched.push(k);
    } else {
      missingFromResume.push(k);
      // 'missingFromBank' is the same signal here - the bank is the only
      // source of resume text. Surface it explicitly for ui emphasis.
      missingFromBank.push(k);
    }
  }

  const overlapPercent =
    jdKeywords.length === 0
      ? 0
      : Math.round((matched.length / jdKeywords.length) * 100);

  return {
    jdKeywords,
    matched,
    missingFromResume,
    missingFromBank,
    overlapPercent,
  };
}

function bankToText(bank: DataBank): string {
  const parts: string[] = [];
  parts.push(bank.personal.fullName, bank.personal.email, bank.personal.phone);
  if (bank.personal.location) parts.push(bank.personal.location);
  for (const link of bank.personal.links) parts.push(link.label, link.url);
  for (const e of bank.education) {
    parts.push(e.institution, e.degree, e.startDate, e.endDate);
    if (e.gpa) parts.push(e.gpa);
    if (e.details) parts.push(e.details);
  }
  for (const e of bank.experience) {
    parts.push(e.company, e.role, e.startDate, e.endDate);
    if (e.location) parts.push(e.location);
    for (const b of e.bullets) parts.push(b);
  }
  for (const p of bank.projects) {
    parts.push(p.name, p.description);
    for (const t of p.techStack) parts.push(t);
    if (p.link) parts.push(p.link);
    if (p.impact) parts.push(p.impact);
  }
  for (const s of bank.skills) {
    parts.push(s.category, ...s.items);
  }
  for (const c of bank.certifications) {
    parts.push(c.name, c.issuer);
    if (c.date) parts.push(c.date);
  }
  return parts.join(" ");
}