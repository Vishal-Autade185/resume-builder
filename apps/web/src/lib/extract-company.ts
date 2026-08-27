/**
 * Company-name extraction from a JD text. Heuristics scan the first
 * ~2000 chars for patterns like "at <Company>", "About <Company>",
 * "<Company> is", and return the first plausible match.
 */
const COMPANY_HINT_PATTERNS: RegExp[] = [
  // "at FinIdeas", "for Google", "with Microsoft"
  /\b(?:at|for|with)\s+([A-Z][\w&'.\-]+(?:\s+[A-Z][\w&'.\-]+)?)\b/,
  // "About FinIdeas"
  /\bAbout\s+([A-Z][\w&'.\-]+(?:\s+[A-Z][\w&'.\-]+)?)/,
  // "FinIdeas is offering / FinIdeas, Inc."
  /\b([A-Z][\w&'.\-]+(?:\s+[A-Z][\w&'.\-]+)?)(?:\s*,?\s*(?:Inc\.?|LLC|Ltd\.?|GmbH))?\s+is\s+(?:offering|hiring|looking|seeking|building)/,
];

const COMPANY_BLACKLIST = new Set([
  "IIT", "IITM", "NIT", "IIIT", "BS", "MS", "ML", "NLP",
  "We", "They", "Our", "The", "This", "You", "Your",
  "Job", "Role", "Organization", "Company",
]);

// Common english nouns that follow "at|for|with" in jds but are
// not company names. We exclude these before accepting a candidate.
const NON_COMPANY_AFTER_AT = new Set([
  "Practitioners", "Techniques", "Learners", "Students", "Engineers",
  "Professionals", "Members", "Participants", "Candidates", "Interns",
  "Hires", "Employees", "Teams", "Managers", "Recruiters",
]);

export function extractCompanyName(jdText: string): string {
  const head = jdText.slice(0, 2000);
  for (const re of COMPANY_HINT_PATTERNS) {
    const m = head.match(re);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (
        candidate.length >= 3 &&
        candidate.length <= 40 &&
        !COMPANY_BLACKLIST.has(candidate) &&
        !NON_COMPANY_AFTER_AT.has(candidate)
      ) {
        return candidate;
      }
    }
  }
  return "";
}