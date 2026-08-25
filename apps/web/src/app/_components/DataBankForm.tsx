/**
 * DataBankForm — the entire phase 0 editor. Renders the personal block +
 * editable lists for education/experience/projects/skills/certifications.
 *
 * Auto-save runs the whole bank through /api/data-bank on every change
 * (debounced 600ms via useAutoSave). This is the user's career data — they
 * expect it to persist the moment they stop typing.
 *
 * No "Save" button. No "Submit". Pure docs-style editing.
 */
"use client";
import { useEffect, useState } from "react";
import type {
  DataBank,
  Education,
  Experience,
  Project,
  Skill,
  Certification,
  PersonalInfo,
} from "@resume-builder/shared";
import { emptyDataBank } from "@resume-builder/shared";
import { useAutoSave } from "../_lib/use-auto-save";
import { usePdfPreview } from "../_lib/use-pdf-preview";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  marginBottom: 2,
};

const sectionStyle: React.CSSProperties = {
  background: "white",
  padding: "1rem",
  borderRadius: 6,
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

function uid(): string {
  return crypto.randomUUID();
}

function PersonalBlock({
  personal,
  onChange,
}: {
  personal: PersonalInfo;
  onChange: (p: PersonalInfo) => void;
}) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 0.5rem" }}>Personal</h3>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} value={personal.fullName}
            onChange={(e) => onChange({ ...personal, fullName: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={personal.email}
            onChange={(e) => onChange({ ...personal, email: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={personal.phone}
            onChange={(e) => onChange({ ...personal, phone: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={personal.location ?? ""}
            onChange={(e) => onChange({ ...personal, location: e.target.value || null })} />
        </div>
      </div>
    </div>
  );
}

function EducationList({
  items,
  onChange,
}: {
  items: Education[];
  onChange: (items: Education[]) => void;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Education</h3>
        <button onClick={() => onChange([
          ...items,
          { id: uid(), institution: "", degree: "", startDate: "", endDate: "", gpa: null, details: null },
        ])}>+ add</button>
      </div>
      {items.map((e, i) => (
        <div key={e.id} style={{ borderTop: i > 0 ? "1px solid #eee" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Institution</label>
              <input style={inputStyle} value={e.institution}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Degree</label>
              <input style={inputStyle} value={e.degree}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Start date</label>
              <input style={inputStyle} placeholder="e.g. May 2023" value={e.startDate}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, startDate: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input style={inputStyle} placeholder="e.g. Present" value={e.endDate}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, endDate: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>GPA</label>
              <input style={inputStyle} value={e.gpa ?? ""}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, gpa: ev.target.value || null } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Details</label>
              <input style={inputStyle} value={e.details ?? ""}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, details: ev.target.value || null } : x))} />
            </div>
          </div>
          <button style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>remove</button>
        </div>
      ))}
    </div>
  );
}

function ExperienceList({
  items,
  onChange,
}: {
  items: Experience[];
  onChange: (items: Experience[]) => void;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Experience</h3>
        <button onClick={() => onChange([
          ...items,
          { id: uid(), company: "", role: "", location: null, startDate: "", endDate: "", bullets: [] },
        ])}>+ add</button>
      </div>
      {items.map((e, i) => (
        <div key={e.id} style={{ borderTop: i > 0 ? "1px solid #eee" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input style={inputStyle} value={e.company}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, company: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input style={inputStyle} value={e.role}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Start date</label>
              <input style={inputStyle} value={e.startDate}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, startDate: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input style={inputStyle} value={e.endDate}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, endDate: ev.target.value } : x))} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={labelStyle}>Bullets (one per line)</label>
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={e.bullets.join("\n")}
              onChange={(ev) => onChange(items.map((x, j) =>
                j === i ? { ...x, bullets: ev.target.value.split("\n").filter(Boolean) } : x
              ))} />
          </div>
          <button style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>remove</button>
        </div>
      ))}
    </div>
  );
}

function ProjectList({
  items,
  onChange,
}: {
  items: Project[];
  onChange: (items: Project[]) => void;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Projects</h3>
        <button onClick={() => onChange([
          ...items,
          { id: uid(), name: "", description: "", techStack: [], startDate: null, endDate: null, link: null, impact: null },
        ])}>+ add</button>
      </div>
      {items.map((e, i) => (
        <div key={e.id} style={{ borderTop: i > 0 ? "1px solid #eee" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={e.name}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Link</label>
              <input style={inputStyle} value={e.link ?? ""}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, link: ev.target.value || null } : x))} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={e.description}
              onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, description: ev.target.value } : x))} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={labelStyle}>Tech stack (comma-separated)</label>
            <input style={inputStyle} value={e.techStack.join(", ")}
              onChange={(ev) => onChange(items.map((x, j) => j === i
                ? { ...x, techStack: ev.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                : x))} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={labelStyle}>Impact</label>
            <input style={inputStyle} value={e.impact ?? ""}
              onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, impact: ev.target.value || null } : x))} />
          </div>
          <button style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>remove</button>
        </div>
      ))}
    </div>
  );
}

function SkillList({
  items,
  onChange,
}: {
  items: Skill[];
  onChange: (items: Skill[]) => void;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Skills</h3>
        <button onClick={() => onChange([...items, { id: uid(), category: "", items: [""] }])}>+ add</button>
      </div>
      {items.map((e, i) => (
        <div key={e.id} style={{ borderTop: i > 0 ? "1px solid #eee" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 2fr" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <input style={inputStyle} value={e.category}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, category: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Items (comma-separated)</label>
              <input style={inputStyle} value={e.items.join(", ")}
                onChange={(ev) => onChange(items.map((x, j) => j === i
                  ? { ...x, items: ev.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                  : x))} />
            </div>
          </div>
          <button style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>remove</button>
        </div>
      ))}
    </div>
  );
}

function CertificationList({
  items,
  onChange,
}: {
  items: Certification[];
  onChange: (items: Certification[]) => void;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Certifications</h3>
        <button onClick={() => onChange([...items, { id: uid(), name: "", issuer: "", date: null, link: null }])}>+ add</button>
      </div>
      {items.map((e, i) => (
        <div key={e.id} style={{ borderTop: i > 0 ? "1px solid #eee" : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={e.name}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
            </div>
            <div>
              <label style={labelStyle}>Issuer</label>
              <input style={inputStyle} value={e.issuer}
                onChange={(ev) => onChange(items.map((x, j) => j === i ? { ...x, issuer: ev.target.value } : x))} />
            </div>
          </div>
          <button style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>remove</button>
        </div>
      ))}
    </div>
  );
}

export function DataBankForm() {
  const [bank, setBank] = useState<DataBank>(emptyDataBank());
  const [loading, setLoading] = useState(true);
  const { status, lastSavedAt } = useAutoSave(bank, !loading);
  const { pdfUrl, compiling, error } = usePdfPreview(bank, !loading);

  useEffect(() => {
    fetch("/api/data-bank")
      .then((r) => r.json())
      .then((body) => { setBank(body.data ?? emptyDataBank()); })
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<DataBank>) => setBank({ ...bank, ...patch });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16 }}>
      <div>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Data Bank</h2>
          <span style={{ fontSize: 12, color: "#666" }}>
            {status === "saving" ? "saving..." : status === "saved" && lastSavedAt ? `saved ${lastSavedAt.toLocaleTimeString()}` : status === "error" ? "save failed" : ""}
          </span>
        </div>
        <PersonalBlock personal={bank.personal}
          onChange={(p) => update({ personal: p })} />
        <EducationList items={bank.education}
          onChange={(items) => update({ education: items })} />
        <ExperienceList items={bank.experience}
          onChange={(items) => update({ experience: items })} />
        <ProjectList items={bank.projects}
          onChange={(items) => update({ projects: items })} />
        <SkillList items={bank.skills}
          onChange={(items) => update({ skills: items })} />
        <CertificationList items={bank.certifications}
          onChange={(items) => update({ certifications: items })} />
      </div>
      <div>
        <h2 style={{ margin: "0 0 12px" }}>Live preview</h2>
        <div style={{ background: "white", borderRadius: 6, padding: 16, minHeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {error && <div style={{ color: "#b00020", fontSize: 13 }}>compile error: {error}</div>}
          {compiling && !error && <div style={{ color: "#666", fontSize: 13 }}>compiling...</div>}
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "80vh", border: "none" }}
              title="Resume preview"
            />
          )}
          {!pdfUrl && !compiling && !error && (
            <div style={{ color: "#999", fontSize: 13 }}>fill in some data and the pdf will render here.</div>
          )}
        </div>
      </div>
    </div>
  );
}
