/**
 * JD match score - product.md section 2.11.
 *
 * Strategy: extract keywords from the jd, then check each against the
 * data bank corpus. Phase 3 ships naive single-word matching + a small
 * set of common 2-word phrases ("machine learning", "data science",
 * "neural network", etc). Tuned in v0.4-phase3 to:
 *   - split on whitespace + punctuation but keep -+# inside tokens
 *     (so "C++", "node.js", "scikit-learn" survive)
 *   - keep acronyms (mlp, mlt, bs, nlp) by NOT treating length<3 as a
 *     stop signal for known acronyms
 *   - filter out pathological merged tokens (length >22 with no vowel
 *     or no space = docx-parse artifact, e.g. 'monthsstipend')
 *   - keep common 2-word phrases as single keywords so 'machine' and
 *     'learning' don't both inflate the missing list
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

// Common english + jd-filler stop words. NOT acronyms.
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "of", "on", "or", "our", "out",
  "that", "the", "their", "them", "they", "this", "to", "we", "will",
  "with", "you", "your", "all", "any", "can", "do", "he", "i",
  "if", "me", "my", "no", "not", "so", "up", "us", "very", "what",
  "when", "who", "why", "how", "been", "being", "but", "just",
  "than", "then", "too", "also", "its", "may", "must", "should",
  "would", "could", "each", "more", "most", "some", "such",
]);

// Common 2-word tech phrases we want to match as units. If a jd says
// "machine learning", we want "machine learning" to count as one
// keyword, not two separate words that each need matching.
const TECH_BIGRAMS = new Set([
  "machine learning", "data science", "data analysis", "data analytics",
  "data engineering", "data structures", "deep learning", "neural networks",
  "neural network", "natural language", "computer science", "computer vision",
  "decision tree", "decision trees", "random forest", "gradient boosting",
  "support vector", "reinforcement learning", "feature engineering",
  "feature selection", "model training", "model deployment", "model evaluation",
  "model performance", "data preprocessing", "data cleaning", "data mining",
  "data visualization", "data warehouse", "data pipelines", "data set",
  "data sets", "time series", "root cause", "unit testing", "test driven",
  "object oriented", "full stack", "front end", "back end", "node js",
  "react js", "next js", "rest api", "rest apis", "graphql api",
  "real time", "real world", "out of sample", "year experience",
  "years experience", "hands on", "self driven", "problem solving",
  "industry experience", "production environment", "open source",
]);

// Common 3-word phrases.
const TECH_TRIGRAMS = new Set([
  "machine learning models", "machine learning algorithms",
  "machine learning techniques", "deep learning models",
  "natural language processing", "data preprocessing and cleaning",
  "machine learning internship", "machine learning intern",
  "real world datasets", "real world data",
]);

// Words we recognize as acronyms (so we never strip them as too-short
// stop words). Lowercase for matching.
const KNOWN_ACRONYMS = new Set([
  "ml", "mlp", "mlt", "dl", "nlp", "ai", "cv", "ui", "ux", "api",
  "sql", "nosql", "aws", "gcp", "mle", "etl", "k8s", "css", "html",
  "bs", "ms", "msc", "bsc", "phd", "iit", "iitm", "nit", "iiit",
]);

/** True if the token is a recognized acronym or looks like one
 * (all caps, or all caps with one trailing s). */
function isAcronymLike(token: string): boolean {
  if (KNOWN_ACRONYMS.has(token)) return true;
  if (/^[a-z]{2,5}$/.test(token) === false) return false;
  // Pronounced-acronym pattern: alternating consonant + vowel, e.g.
  // 'iitm', 'mlp', 'sql'. Heuristic.
  return /^[bcdfghjklmnpqrstvwxz][aeiou][bcdfghjklmnpqrstvwxz][aeiou]?$/.test(
    token,
  );
}

/** True if the token is a merged-garbage artifact. Common patterns
 * we see from docx / pdf parsing where words run together without
 * whitespace:
 *   - digit + letters ("2duration", "3monthsstipend", "11amist")
 *   - two distinct word-roots squashed together ("internorganization",
 *     "monthsstipend", "outofsample" — but we want to allow
 *     "camelcase" real-world tokens, so we use structural signals)
 */
function isGarbageMerged(token: string): boolean {
  // Digit-letter boundary inside a token. Real english tokens almost
  // never have a digit in the middle of an alphabetic run unless it's
  // a known technical form like "C99" or "ISO9001".
  if (/[a-z]\d[a-z]|\d[a-z]\d/.test(token)) return true;
  // Token contains digits + letters with no recognized separator form.
  // Catches "2duration", "11amist", "3monthsstipend".
  if (/\d/.test(token) && /[a-z]/.test(token) && !/[-+#.]/.test(token)) return true;
  // 4+ consecutive consonants (no vowel) = almost certainly a merge
  // artifact. Real english words always have a vowel within 4 chars.
  if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(token)) return true;
  // CamelCase merge: original was "InternOrganization", lowercased to
  // 'internorganization'. Detect: length>14 + no internal separator +
  // 3+ vowel groups (real words have 1-2; merged garbage has 3+).
  if (token.length > 14 && !/[-+#.]/.test(token)) {
    const vowelGroups = token.match(/[aeiouy]+/g) ?? [];
    if (vowelGroups.length >= 3) return true;
  }
  return false;
}

export function extractKeywords(text: string): string[] {
  // Split on whitespace + punctuation, but keep C++ / scikit-learn / node.js.
  const raw = text
    .toLowerCase()
    .split(/[^a-z0-9+#.\-]+/)
    .filter(Boolean);

  // First pass: build the list of single-word keywords.
  const singles: string[] = [];
  for (const w of raw) {
    if (w.length < 2) continue;
    if (/^\d+$/.test(w)) continue;
    if (STOP_WORDS.has(w) && !isAcronymLike(w)) continue;
    if (isGarbageMerged(w)) continue;
    if (w.length < 3 && !isAcronymLike(w)) continue;
    singles.push(w);
  }

  // Second pass: detect bigrams/trigrams that are common tech phrases.
  const phrases: string[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const bigram = `${raw[i]} ${raw[i + 1]}`;
    if (TECH_BIGRAMS.has(bigram)) {
      phrases.push(bigram);
    }
  }
  for (let i = 0; i < raw.length - 2; i++) {
    const trigram = `${raw[i]} ${raw[i + 1]} ${raw[i + 2]}`;
    if (TECH_TRIGRAMS.has(trigram)) {
      phrases.push(trigram);
    }
  }

  return Array.from(new Set([...singles, ...phrases]));
}

export function computeJdMatchScore(args: {
  jdText: string;
  bank: DataBank;
}): JdMatchScore {
  const jdKeywords = extractKeywords(args.jdText);
  const bankCorpus = bankToText(args.bank).toLowerCase();

  const matched: string[] = [];
  const missingFromResume: string[] = [];

  for (const k of jdKeywords) {
    // Phrase match: any of the phrase's words present in the corpus is
    // a weak signal. Strong signal: the whole phrase is present.
    const inCorpus =
      bankCorpus.includes(k) ||
      (k.includes(" ") &&
        k.split(" ").every((w) => bankCorpus.includes(w)));
    if (inCorpus) {
      matched.push(k);
    } else {
      missingFromResume.push(k);
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
    missingFromBank: missingFromResume, // same source: bank is the corpus
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