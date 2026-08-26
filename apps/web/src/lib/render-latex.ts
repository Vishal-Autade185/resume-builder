/**
 * Structured-field renderer - phase 0+1.
 *
 * DataBank -> LaTeX source. The ONLY producer of .tex in this app.
 * AI in phase 2+ edits DataBank fields; this renderer re-emits .tex.
 * Per product.md section 4: AI never edits raw LaTeX directly.
 */
import type { DataBank, Selection } from "@resume-builder/shared";
import { applySelection } from "@resume-builder/shared";

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function section(title: string, body: string): string {
  if (!body) return "";
  return (
    "\n\\section*{" + escapeLatex(title) + "}" +
    "\n" + body + "\n"
  );
}

function renderPersonal(p: DataBank["personal"]): string {
  const lines = ["\\textbf{\\Large " + escapeLatex(p.fullName) + "}", "\\\\"];
  const contacts: string[] = [];
  if (p.email) contacts.push(escapeLatex(p.email));
  if (p.phone) contacts.push(escapeLatex(p.phone));
  if (p.location) contacts.push(escapeLatex(p.location));
  for (const link of p.links) {
    contacts.push(
      "\\href{" + escapeLatex(link.url) + "}{" + escapeLatex(link.label) + "}",
    );
  }
  if (contacts.length) lines.push(contacts.join(" $|$ "));
  return lines.join("\n");
}

function renderEducation(items: DataBank["education"]): string {
  if (!items.length) return "";
  return items
    .map((e) => {
      const dates = escapeLatex(e.startDate) + " -- " + escapeLatex(e.endDate);
      let out =
        "\\textbf{" + escapeLatex(e.institution) + "} \\hfill " + dates + "\\\\";
      out += "\n\\textit{" + escapeLatex(e.degree) + "}";
      if (e.gpa) out += "\nGPA: " + escapeLatex(e.gpa);
      if (e.details) out += "\n" + escapeLatex(e.details);
      return out;
    })
    .join("\n\\\\\n");
}

function renderExperience(items: DataBank["experience"]): string {
  if (!items.length) return "";
  return items
    .map((e) => {
      const dates = escapeLatex(e.startDate) + " -- " + escapeLatex(e.endDate);
      let out =
        "\\textbf{" + escapeLatex(e.role) + "} \\hfill " + dates + "\\\\";
      out += "\n\\textit{" + escapeLatex(e.company) + "}";
      if (e.location) out += ", " + escapeLatex(e.location);
      if (e.bullets.length) {
        out += "\n\\begin{itemize}\n";
        out += e.bullets.map((b) => "  \\item " + escapeLatex(b)).join("\n");
        out += "\n\\end{itemize}";
      }
      return out;
    })
    .join("\n\\\\\n");
}

function renderProjects(items: DataBank["projects"]): string {
  if (!items.length) return "";
  return items
    .map((p) => {
      let out = "\\textbf{" + escapeLatex(p.name) + "}";
      if (p.link) out += " \\hfill \\href{" + escapeLatex(p.link) + "}{link}";
      out += "\n" + escapeLatex(p.description);
      if (p.startDate || p.endDate) {
        out +=
          "\n\\textit{" +
          escapeLatex(p.startDate ?? "") + " -- " +
          escapeLatex(p.endDate ?? "") + "}";
      }
      if (p.techStack.length) {
        out += "\n\\textit{Tech: " + p.techStack.map(escapeLatex).join(", ") + "}";
      }
      if (p.impact) {
        out += "\n\\textbf{Impact:} " + escapeLatex(p.impact);
      }
      return out;
    })
    .join("\n\\\\\n");
}

function renderSkills(items: DataBank["skills"]): string {
  if (!items.length) return "";
  return items
    .map(
      (s) =>
        "\\textbf{" + escapeLatex(s.category) + ":} " +
        s.items.map(escapeLatex).join(", "),
    )
    .join("\n\\\\\n");
}

function renderCertifications(items: DataBank["certifications"]): string {
  if (!items.length) return "";
  return items
    .map((c) => {
      const date = c.date ? " (" + escapeLatex(c.date) + ")" : "";
      return "\\item " + escapeLatex(c.name) + " -- " + escapeLatex(c.issuer) + date;
    })
    .join("\n");
}

const DEFAULT_PREAMBLE =
  "\\documentclass{article}\n" +
  "\\usepackage[utf8]{inputenc}\n" +
  "\\usepackage{hyperref}\n";

export function renderDataBankToLatex(
  bank: DataBank,
  options:
    | string
    | {
        preamble?: string;
        selection?: Selection;
      } = {},
): string {
  const opts = typeof options === "string" ? { preamble: options } : options;
  const preamble = opts.preamble ?? DEFAULT_PREAMBLE;
  const sel = opts.selection;

  const education = sel ? applySelection(bank.education, sel.education) : bank.education;
  const experience = sel ? applySelection(bank.experience, sel.experience) : bank.experience;
  const projects = sel ? applySelection(bank.projects, sel.projects) : bank.projects;
  const skills = sel ? applySelection(bank.skills, sel.skills) : bank.skills;
  const certifications = sel
    ? applySelection(bank.certifications, sel.certifications)
    : bank.certifications;

  const parts: string[] = [preamble, "\\begin{document}\n"];
  parts.push(renderPersonal(bank.personal));
  parts.push(section("Education", renderEducation(education)));
  parts.push(section("Experience", renderExperience(experience)));
  parts.push(section("Projects", renderProjects(projects)));
  parts.push(section("Skills", renderSkills(skills)));
  if (certifications.length) {
    parts.push(
      section(
        "Certifications",
        "\\begin{itemize}\n" + renderCertifications(certifications) + "\n\\end{itemize}",
      ),
    );
  }
  parts.push("\n\\end{document}");
  return parts.join("\n");
}