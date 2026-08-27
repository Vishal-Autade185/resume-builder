/**
 * renderTemplate - splices data-bank values into an uploaded LaTeX
 * template, producing a .tex source ready for tectonic compilation.
 *
 * Strategy:
 *   1. Parse the template into preamble + body using \begin{document}
 *      and \end{document} as anchors.
 *   2. For each \section{...} in the body, decide what to insert based
 *      on the section heading (same heuristic as the parser):
 *        - personal / header   -> render bank.personal header
 *        - education           -> render all bank.education entries
 *        - experience          -> render all bank.experience entries
 *        - projects            -> render all bank.projects entries
 *        - skills              -> render bank.skills
 *        - certifications      -> render bank.certifications
 *        - summary / other     -> keep the template's existing body
 *   3. Splice the rendered content into the section body, replacing
 *      everything between the \section{...} macro and the next \section
 *      (or \end{document}).
 *   4. Apply selection: items the user has deselected are skipped.
 *
 * The rendered content uses the SAME latex commands the template
 * defines (\resumeSubheading, \resumeItem, etc). For this to work
 * the template must define those commands in its preamble - which
 * jake's-resume templates do.
 */
import type { DataBank, Selection } from "@resume-builder/shared";

function latexEscape(s: string): string {
  // Escape characters that have special meaning in LaTeX.
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
 .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function isSelected(
  selection: Selection | undefined,
  collection: "education" | "experience" | "projects" | "skills" | "certifications",
  id: string,
): boolean {
  if (!selection) return true;
  const list = selection[collection];
  if (!list) return true; // selection key not set => include all
  return list.includes(id);
}

function renderPersonal(bank: DataBank): string {
  const p = bank.personal;
  const contactParts: string[] = [];
  if (p.phone) contactParts.push(`\\faPhone\\ ${latexEscape(p.phone)}`);
  if (p.email) {
    contactParts.push(
      `\\href{mailto:${p.email}}{\\faEnvelope\\ ${latexEscape(p.email)}}`,
    );
  }
  const linkedin = p.links.find((l) =>
    l.label.toLowerCase().includes("linkedin"),
  );
  if (linkedin) {
    contactParts.push(
      `\\href{${latexEscape(linkedin.url)}}{\\faLinkedin\\ ${latexEscape(linkedin.url.replace(/^https?:\/\//, ""))}}`,
    );
  }
  const github = p.links.find((l) =>
    l.label.toLowerCase().includes("github"),
  );
  if (github) {
    contactParts.push(
      `\\href{${latexEscape(github.url)}}{\\faGithub\\ ${latexEscape(github.url.replace(/^https?:\/\//, ""))}}`,
    );
  }
  const contactLine = contactParts.length > 0
    ? contactParts.join(" $|$ ")
    : "";
  return `\\vspace{-10pt}
\\begin{center}
    {\\Huge \\scshape ${latexEscape(p.fullName)}} \\\\ \\vspace{2pt}
    \\small ${contactLine}
    \\\\
    \\vspace{-10pt}\\rule{\\textwidth}{0.2mm}\\vspace{-10pt}
\\end{center}`;
}

function renderEducationItem(e: DataBank["education"][number]): string {
  const gpa = e.gpa ? ` (GPA: ${latexEscape(e.gpa)})` : "";
  const location = ""; // Education location isn't in the data bank schema
  return `\\resumeSubheading
  {${latexEscape(e.institution)}}{${latexEscape(location || "")}}
  {${latexEscape(e.degree)}${latexEscape(gpa)}}{${latexEscape(e.startDate)} -- ${latexEscape(e.endDate)}}`;
}

function renderExperienceItem(e: DataBank["experience"][number]): string {
  const loc = e.location ? latexEscape(e.location) : "";
  return `\\resumeSubheading
  {${latexEscape(e.role)}}{${loc}}
  {${latexEscape(e.company)}}{${latexEscape(e.startDate)} -- ${latexEscape(e.endDate)}}
\\resumeItemListStart
${e.bullets.map((b) => `  \\resumeItem{${latexEscape(b)}}`).join("\n")}
\\resumeItemListEnd`;
}

function renderProjectItem(p: DataBank["projects"][number]): string {
  const dates = [p.startDate, p.endDate].filter(Boolean).join(" -- ");
  return `\\resumeProjectHeading
  {${latexEscape(p.name)}}{${latexEscape(dates)}}
\\resumeItemListStart
  \\resumeItem{${latexEscape(p.description)}}
${
  p.impact
    ? `  \\resumeItem{${latexEscape(p.impact)}}`
    : ""
}
${p.techStack && p.techStack.length > 0
    ? `  \\resumeItem{Tech: ${p.techStack.map(latexEscape).join(", ")}}`
    : ""
}
\\resumeItemListEnd`;
}

function renderCertifications(c: DataBank["certifications"][number]): string {
  return `\\resumeProjectHeading
  {${latexEscape(c.name)}}{${latexEscape(c.date || "")}}
\\resumeItemListStart
  \\resumeItem{${latexEscape(c.issuer)}}${c.link ? ` \\href{${latexEscape(c.link)}}{link}` : ""}
\\resumeItemListEnd`;
}

/** Dedupe \usepackage{...} lines by package name. Keep the first
 * occurrence. Tectonic dies on duplicate package includes. */
function dedupePackages(preamble: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of preamble.split("\n")) {
    const m = line.match(/^\\usepackage(?:\[[^\]]*\])?\s*\{([^}]+)\}/);
    if (m) {
      const pkgs = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      const isNew = pkgs.some((p) => !seen.has(p));
      if (isNew) {
        for (const p of pkgs) seen.add(p);
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Find each \section{...} in the body and replace its content.
 * Uses brace-counting so \section arguments don't get cut off by
 * inner closing braces (e.g. inside \resumeSubheading).
 */
function findSectionsWithBraceCount(body: string): {
  heading: string;
  startIdx: number;
  contentStartIdx: number;
}[] {
  const out: {
    heading: string;
    startIdx: number;
    contentStartIdx: number;
  }[] = [];
  // Find every \section and \section* (handles * optional).
  const headerRe = /\\section\*?\{/g;
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(body)) !== null) {
    const startIdx = m.index;
    const openIdx = m.index + m[0].length;
    let depth = 1;
    let i = openIdx;
    while (i < body.length && depth > 0) {
      const ch = body[i];
      if (ch === "\\") {
        i += 2; // skip escaped char
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) continue; // unbalanced; skip
    const heading = body.slice(openIdx, i - 1).trim();
    out.push({ heading, startIdx, contentStartIdx: i });
  }
  return out;
}

export function renderTemplate(args: {
  templateTex: string;
  bank: DataBank;
  selection?: Selection;
}): string {
  const { templateTex, bank, selection } = args;

  // Split on \begin{document} ... \end{document}
  const beginMatch = templateTex.match(/\\begin\{document\}/);
  const endMatch = templateTex.match(/\\end\{document\}/);
  if (!beginMatch || !endMatch) {
    throw new Error("template is missing \\begin{document} or \\end{document}");
  }
  const rawPreamble = templateTex.slice(0, beginMatch.index!);
  const body = templateTex.slice(beginMatch.index!, endMatch.index!);
  const after = templateTex.slice(endMatch.index!);

  // Normalize preamble: dedupe \usepackage{...} lines. Some templates
  // include the same package twice (e.g. hyperref with different
  // options). Tectonic refuses this. Keep the first occurrence.
  let preamble = dedupePackages(rawPreamble);
  // Note: tectonic runs xetex. pdftex-only macros like
  // \pdfglyphtounicode are NOT neutered - they cause xetex to fail.
  // The parser flags these via looksLikePdftexOnly() so the UI can
  // warn the user before they try to render.

  const sections = findSectionsWithBraceCount(body);

  // Splice each section's content with rendered bank data.
  // For sections where the parser has a replacement (education,
  // experience, projects, etc.), use the replacement. For sections
  // without a replacement (summary, unknown headings), keep the
  // template's original body verbatim.
  let out = "";
  let cursor = 0;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    // Emit template content before this section's heading end.
    out += body.slice(cursor, sec.contentStartIdx);
    const replacement = renderSectionByHeading(sec.heading, bank, selection);
    if (replacement.length > 0) {
      // We have a replacement. Skip the template's existing body
      // (cursor jumps to the next section's startIdx).
      out += `\n${replacement}\n`;
    } else {
      // No replacement - keep the template's body verbatim. Cursor
      // advances past the body to the next section.
      const bodyEnd = i + 1 < sections.length
        ? sections[i + 1].startIdx
        : body.length;
      out += body.slice(sec.contentStartIdx, bodyEnd);
    }
    cursor = i + 1 < sections.length
      ? sections[i + 1].startIdx
      : body.length;
  }
  out += body.slice(cursor);

  return preamble + out + after;
}

function renderSectionByHeading(
  heading: string,
  bank: DataBank,
  selection: Selection | undefined,
): string {
  const h = heading.toLowerCase();
  // Header is rendered before \section{} in jake's-resume, not as a section.
  // So \section{} corresponds to the structured blocks.
  if (h.includes("educ") || h.includes("academ")) {
    return bank.education
      .filter((e) => isSelected(selection, "education", e.id))
      .map((e) => `\\resumeSubHeadingListStart\n${renderEducationItem(e)}\n\\resumeSubHeadingListEnd`)
      .join("\n\n");
  }
  if (h.includes("experien") || h.includes("work") || h.includes("employ")) {
    return bank.experience
      .filter((e) => isSelected(selection, "experience", e.id))
      .map((e) => `\\resumeSubHeadingListStart\n${renderExperienceItem(e)}\n\\resumeSubHeadingListEnd`)
      .join("\n\n");
  }
  if (h.includes("project")) {
    return bank.projects
      .filter((p) => isSelected(selection, "projects", p.id))
      .map((p) => `\\resumeSubHeadingListStart\n${renderProjectItem(p)}\n\\resumeSubHeadingListEnd`)
      .join("\n\n");
  }
  if (h.includes("skill") || h.includes("technic") || h.includes("tool")) {
    // Render as itemize where each skill category is one \item. This
    // matches the typical jake's-resume pattern for skills sections.
    const items = bank.skills.map(
      (s) =>
        `\\item \\textbf{${latexEscape(s.category)}}{: ${s.items.map(latexEscape).join(", ")}}`,
    );
    if (items.length === 0) return "";
    return `\\begin{itemize}[leftmargin=0.15in, label={}]\n${items.join("\n")}\n\\end{itemize}`;
  }
  if (h.includes("certif") || h.includes("license") || h.includes("award")) {
    return bank.certifications
      .filter((c) => isSelected(selection, "certifications", c.id))
      .map(renderCertifications)
      .join("\n\n");
  }
  // Summary, objective, etc. - keep the template's existing content.
  // The caller will splice the template's original body in.
  return "";
}
