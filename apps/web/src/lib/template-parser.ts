/**
 * Template parser - reads an uploaded .tex template and detects which
 * data-bank fields it expects.
 *
 * Strategy (jake's-resume convention, the source style of your
 * resume_template.zip):
 *   - HEADER block:  one \Huge \scshape NAME line, with optional
 *                    \faPhone / \faEnvelope / \faLinkedin / \faGithub
 *                    macros below it
 *   - SUMMARY:       one \section{SUMMARY} block
 *   - EDUCATION:     N \resumeSubheading macros, each followed by a
 *                    \resumeItemListStart ... \resumeItemListEnd block
 *   - EXPERIENCE:    N \resumeSubheading macros + \resumeItem blocks
 *                    (distinguished from education by the surrounding
 *                    \section{...} name)
 *   - PROJECTS:      N \resumeProjectHeading macros + \resumeItem blocks
 *   - SKILLS:        one \section{SKILLS} block with category text
 *   - CERTIFICATIONS:N \resumeItem macros under \section{CERTIFICATIONS}
 *
 * Output is a DetectedFields object with counts + the section names
 * the template uses, so the UI can render "1 experience entry, 2
 * project entries" instead of always showing all fields.
 *
 * This is a heuristic - the parser is intentionally conservative
 * (won't over-report). False negatives are fine; false positives
 * would mislead the user.
 */
import type { SectionKind } from "@resume-builder/shared";

export type DetectedSection = {
  kind: SectionKind;
  /** Number of repeating entries in this section (1 header, 2 experience, etc). */
  count: number;
  /** The exact heading text from the template ("Education", "EDUCATION", etc). */
  heading: string | null;
};

export type DetectedFields = {
  sections: DetectedSection[];
  /** True if the template has any repeating structure we can fill. */
  fillable: boolean;
  /** Macro commands the parser recognized. For diagnostics. */
  recognizedMacros: string[];
};

/** Find all `\section{...}` headings and their positions. */
function findSections(tex: string): { name: string; index: number }[] {
  const out: { name: string; index: number }[] = [];
  const re = /\\section\*?\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(tex)) !== null) {
    out.push({ name: m[1].trim(), index: m.index });
  }
  return out;
}

/** Count occurrences of a fully-qualified command in the source. */
function countCommand(tex: string, name: string): number {
  const re = new RegExp(`\\\\${name}\\b`, "g");
  return (tex.match(re) ?? []).length;
}

/** Slice of tex between two section heading indices. */
function sliceBetween(tex: string, start: number, end: number): string {
  return tex.slice(start, end);
}

/**
 * Try to identify whether a section is education or experience based
 * on macro density + heading keywords.
 *
 * jake's-resume: BOTH use \resumeSubheading. Distinguish by:
 *   - heading text contains "EDUCATION" / "EDUC" -> education
 *   - heading text contains "EXPERIENCE" / "WORK" -> experience
 *   - if no keyword match, default to education if 4-arg subheadings
 *     + no \resumeItem between them (typical for old edu format),
 *     else experience.
 */
function classifySubheadingSection(
  heading: string,
  body: string,
): "education" | "experience" | "unknown" {
  const h = heading.toLowerCase();
  if (h.includes("educ") || h.includes("academ")) return "education";
  if (
    h.includes("experien") ||
    h.includes("work") ||
    h.includes("employ") ||
    h.includes("profess")
  ) {
    return "experience";
  }
  // Fallback heuristic: more bullets = experience, fewer = education.
  const itemCount = countCommand(body, "resumeItem");
  const subheadCount = countCommand(body, "resumeSubheading");
  if (subheadCount === 0) return "unknown";
  if (itemCount / subheadCount >= 1.5) return "experience";
  return "education";
}

export function detectTemplateFields(tex: string): DetectedFields {
  const recognizedMacros: string[] = [];
  const sections = findSections(tex);

  const out: DetectedSection[] = [];

  // Header detection: \Huge \scshape NAME or \name{NAME} or contact
  // macros anywhere in the document.
  const hasHuge = /\\Huge\s*\\scshape\s+/.test(tex);
  const hasName = /\\name\b/.test(tex);
  const hasPhone = /\\faPhone/.test(tex);
  const hasEmail = /\\faEnvelope|mailto:/.test(tex);
  const hasGithub = /\\faGithub|github\.com/.test(tex);
  const hasLinkedin = /\\faLinkedin|linkedin\.com/.test(tex);
  const hasHeader = hasHuge || hasName;
  if (hasHeader) {
    recognizedMacros.push("name-block");
    out.push({
      kind: "personal",
      count: 1,
      heading: null,
    });
  }

  // Walk each section and classify.
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const startIdx = sec.index;
    const endIdx = i + 1 < sections.length ? sections[i + 1].index : tex.length;
    const body = sliceBetween(tex, startIdx, endIdx);

    const subheadCount = countCommand(body, "resumeSubheading");
    const projCount = countCommand(body, "resumeProjectHeading");
    const itemCount = countCommand(body, "resumeItem");

    if (projCount > 0) {
      // Distinguish certifications / volunteering / awards from
      // projects by the section heading. These all use
      // \resumeProjectHeading but semantically aren't projects.
      const h = sec.name.toLowerCase();
      if (/certif|license|award|honor/.test(h)) {
        recognizedMacros.push("resumeProjectHeading(certifications)");
        out.push({
          kind: "certifications",
          count: projCount,
          heading: sec.name,
        });
      } else if (/volunteer|community|service|extracurricular/.test(h)) {
        recognizedMacros.push("resumeProjectHeading(volunteering)");
        out.push({
          kind: "projects",
          count: projCount,
          heading: sec.name,
        });
      } else {
        recognizedMacros.push("resumeProjectHeading");
        out.push({
          kind: "projects",
          count: projCount,
          heading: sec.name,
        });
      }
      continue;
    }

    if (subheadCount > 0) {
      const cls = classifySubheadingSection(sec.name, body);
      if (cls === "education") {
        recognizedMacros.push("resumeSubheading(education)");
        out.push({
          kind: "education",
          count: subheadCount,
          heading: sec.name,
        });
      } else if (cls === "experience") {
        recognizedMacros.push("resumeSubheading(experience)");
        out.push({
          kind: "experience",
          count: subheadCount,
          heading: sec.name,
        });
      } else {
        // Unknown subheading section - default to experience since most
        // unknown subheading blocks are job history.
        recognizedMacros.push("resumeSubheading(assumed-experience)");
        out.push({
          kind: "experience",
          count: subheadCount,
          heading: sec.name,
        });
      }
      // Items in the same block as the section but outside subheading
      // commands are typically project bullets. We don't double-count
      // them here; the projects section above handles its own.
      continue;
    }

    // Skills section: heading keyword match + free-text body.
    if (/skill|technologies|tools/i.test(sec.name)) {
      out.push({ kind: "skills", count: 1, heading: sec.name });
      recognizedMacros.push("skills-section");
      continue;
    }

    // Summary / objective: single-block text.
    if (/summary|objective|profile|about/i.test(sec.name)) {
      out.push({ kind: "summary", count: 1, heading: sec.name });
      recognizedMacros.push("summary-section");
      continue;
    }

    // Certifications: a section that ends with no subheading but has
    // resumeItems.
    if (itemCount > 0 && /certif|license|award/i.test(sec.name)) {
      out.push({
        kind: "certifications",
        count: itemCount,
        heading: sec.name,
      });
      recognizedMacros.push("certifications-section");
      continue;
    }
  }

  // Fillable = at least one repeating structure (excluding personal).
  const fillable =
    out.some(
      (s) =>
        s.kind !== "personal" && s.kind !== "summary" && s.count > 0,
    );

  return { sections: out, fillable, recognizedMacros };
}

/**
 * Sanity-check: is this a likely-valid latex file? Used as a soft
 * validation when uploading. We don't try to fully parse it - we just
 * look for telltale signs (\documentclass, \begin{document}).
 */
export function looksLikeLatex(tex: string): boolean {
  return /\\documentclass\b/.test(tex) && /\\begin\{document\}/.test(tex);
}

/**
 * Detect pdftex-only macros that won't compile under xetex (which
 * tectonic uses by default). The list is conservative - only macros
 * seen in real templates.
 *
 * Returned as a list so the UI can show the user which specific
 * commands are problematic, not just "incompatible".
 */
export function findPdftexOnlyMacros(tex: string): string[] {
  const PDFTEX_ONLY = [
    "pdfglyphtounicode",
    "pdfoutput",
    "pdfminorversion",
    "pdfhorigin",
    "pdfvorigin",
    "pdfpagewidth",
    "pdfpageheight",
    "pdfcompresslevel",
    "pdfobjcompresslevel",
    "pdftexbanner",
    "pdfmapfile",
    "pdfdest",
  ];
  const out: string[] = [];
  for (const m of PDFTEX_ONLY) {
    const re = new RegExp(`\\\\${m}\\b`);
    if (re.test(tex)) out.push(m);
  }
  return out;
}
