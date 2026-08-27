/**
 * /jd/[id] - single jd view + AI tailor flow.
 *
 * Shows the jd (text + warnings + metadata), a "Tailor with AI" button,
 * and after tailoring a list of ProposedChange cards with per-change
 * accept/reject + a global "Apply accepted" button.
 *
 * The diff/accept-reject mechanism is the one used everywhere AI touches
 * the resume per product.md section 2.13.
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import type { ProposedChange, JdMatchScore, CompanyResearch } from "@resume-builder/shared";
import { extractCompanyName } from "@/lib/extract-company";

type JdSummary = {
  id: string;
  source: "text" | "pdf" | "docx";
  sourceName: string | null;
  warnings: string[];
  createdAt: string;
};

type TailorResponse = {
  changes: ProposedChange[];
  rejected: { change: ProposedChange; reason: string }[];
  warnings: string[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
};

const cardStyle: React.CSSProperties = {
  background: "white", padding: "1rem", borderRadius: 6, marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function JdDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [jd, setJd] = useState<JdSummary | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchScore, setMatchScore] = useState<JdMatchScore | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<TailorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // decisions: { [changeId]: "accepted" | "rejected" }
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [research, setResearch] = useState<CompanyResearch | null>(null);
  const [researching, setResearching] = useState(false);
  const [applyingResearch, setApplyingResearch] = useState(false);
  const [researchApplied, setResearchApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [jdRes, scoreRes] = await Promise.all([
        fetch(`/api/jd/${id}/text`),
        fetch(`/api/jd/${id}/match`),
      ]);
      if (cancelled) return;
      if (jdRes.ok) {
        const body = await jdRes.json();
        setJd(body.jd);
        setRawText(body.rawText);
      }
      if (scoreRes.ok) {
        const body = await scoreRes.json();
        setMatchScore(body.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function tailor() {
    setTailoring(true);
    setError(null);
    setTailorResult(null);
    setDecisions({});
    setApplied(false);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `tailor failed (${res.status})`);
      }
      const body = (await res.json()) as TailorResponse;
      setTailorResult(body);
      // Default: accept everything that wasn't rejected by fact-grounding.
      const initial: Record<string, "accepted" | "rejected"> = {};
      for (const c of body.changes) initial[c.id] = "accepted";
      setDecisions(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTailoring(false);
    }
  }

  async function applyAccepted() {
    if (!tailorResult) return;
    const accepted = tailorResult.changes
      .filter((c) => decisions[c.id] === "accepted")
      .map((c) => ({ ...c, status: "accepted" as const }));
    if (accepted.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/tailor/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `apply failed (${res.status})`);
      }
      const body = await res.json();
      setApplied(true);
      // Reset the proposal state - new round of changes requires new tailor.
      setTailorResult(null);
      setDecisions({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  if (loading || !jd) {
    return (
      <main style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
        <p style={{ color: "#666" }}>{error ?? "loading..."}</p>
      </main>
    );
  }

  const acceptedCount = tailorResult
    ? tailorResult.changes.filter((c) => decisions[c.id] === "accepted").length
    : 0;
  const rejectedCount = tailorResult
    ? tailorResult.changes.length - acceptedCount
    : 0;

  const derivedCompanyName =
    rawText ? extractCompanyName(rawText) : "";

  async function runResearch(nameOverride?: string) {
    const name = (nameOverride ?? derivedCompanyName).trim();
    if (!name) {
      setError("could not detect company name in jd. try entering it manually.");
      return;
    }
    setResearching(true);
    setError(null);
    try {
      const res = await fetch("/api/company-research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: name, jdId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `research failed (${res.status})`);
      }
      const body = await res.json();
      setResearch(body.data);
      setResearchApplied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResearching(false);
    }
  }

  async function applyResearch() {
    if (!research) return;
    setApplyingResearch(true);
    setError(null);
    try {
      const res = await fetch("/api/company-research/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: research.summary }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `apply failed (${res.status})`);
      }
      setResearchApplied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingResearch(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <Link href="/jd" style={{ fontSize: 13, color: "#1f3a5f" }}>← all jds</Link>
        <h1 style={{ margin: "0.5rem 0 0" }}>{jd.sourceName ?? "Untitled jd"}</h1>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          {jd.source.toUpperCase()} · {new Date(jd.createdAt).toLocaleString()}
        </div>
        {jd.warnings.length > 0 && (
          <div style={{ marginTop: 8, padding: "0.5rem 0.75rem", background: "#fff5f5", border: "1px solid #ebb", borderRadius: 4, fontSize: 13 }}>
            ⚠ {jd.warnings.join(" / ")}
          </div>
        )}
      </header>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 0.5rem" }}>Raw text</h3>
        <pre style={{
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          background: "#fafafa",
          padding: 12,
          borderRadius: 4,
          maxHeight: 280,
          overflow: "auto",
        }}>
          {rawText ?? "(loading…)"}
        </pre>
      </div>

      {matchScore && <MatchScorePanel score={matchScore} />}

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 0.5rem" }}>Company research</h3>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 0.75rem" }}>
          Searches the web for company info (mission, values, recent
          news) and surfaces jd-to-company alignment. Use this to
          tailor your summary section to what the company cares about.
        </p>
        {derivedCompanyName ? (
          <div style={{ fontSize: 13, color: "#1f3a5f", marginBottom: 8 }}>
            detected company: <strong>{derivedCompanyName}</strong>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#a60", marginBottom: 8 }}>
            could not detect a company name in this jd's text. you can
            still research by entering a name below.
          </p>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => runResearch()}
            disabled={researching || (!derivedCompanyName && !research)}
            style={{
              padding: "0.5rem 1rem", fontSize: 14,
              background: researching ? "#888" : "#1f3a5f",
              color: "white", border: "none", borderRadius: 4,
              cursor: researching ? "wait" : "pointer",
            }}
          >
            {researching
              ? "researching (~10s)..."
              : derivedCompanyName
                ? `Research ${derivedCompanyName}`
                : "Research"}
          </button>
          <input
            type="text"
            id="manualCompanyName"
            placeholder="or enter company name"
            style={{
              padding: "0.4rem 0.6rem", fontSize: 13,
              border: "1px solid #ccc", borderRadius: 4, width: 220,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                runResearch(v);
              }
            }}
          />
        </div>
        {research && (
          <div
            style={{
              marginTop: 12, padding: 12, background: "#f9f9f9",
              border: "1px solid #eee", borderRadius: 4, fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {research.companyName}
            </div>
            <p style={{ margin: "0 0 8px", lineHeight: 1.5 }}>
              {research.summary}
            </p>
            {research.values.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Values: </span>
                {research.values.join(", ")}
              </div>
            )}
            {research.recentNews.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Recent news: </span>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {research.recentNews.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {research.jdAlignment.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>JD alignment: </span>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {research.jdAlignment.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={applyResearch}
                disabled={applyingResearch || researchApplied}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: 13,
                  background: researchApplied ? "#888" : "#1f3a5f",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: applyingResearch ? "wait" : "pointer",
                }}
              >
                {applyingResearch
                  ? "applying..."
                  : researchApplied
                    ? "applied ✓ (saved to data bank)"
                    : "Use this as my summary"}
              </button>
              {researchApplied && (
                <span style={{ fontSize: 12, color: "#1a3" }}>
                  saved to data bank. next version will include it.
                </span>
              )}
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "#666" }}>
                sources ({research.sources.length})
              </summary>
              <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: 11 }}>
                {research.sources.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#1f3a5f" }}>
                      {s.title}
                    </a>
                    <div style={{ color: "#888" }}>{s.excerpt.slice(0, 200)}...</div>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tailorResult ? 12 : 0 }}>
          <h3 style={{ margin: 0 }}>AI tailoring</h3>
          <button
            onClick={tailor}
            disabled={tailoring || !rawText}
            style={{
              padding: "0.5rem 1rem", fontSize: 14,
              background: tailoring ? "#888" : "#1f3a5f",
              color: "white", border: "none", borderRadius: 4,
              cursor: tailoring ? "wait" : "pointer",
            }}
          >
            {tailoring ? "tailoring (this takes ~20s)..." : tailorResult ? "re-tailor" : "Tailor with AI"}
          </button>
        </div>
        {error && (
          <div style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{error}</div>
        )}
        {applied && (
          <div style={{ color: "#1a3", fontSize: 13, marginTop: 8 }}>
            ✓ Applied accepted changes. Tailor again to see what changed.
          </div>
        )}
        {tailorResult && (
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            {tailorResult.changes.length} proposed · {acceptedCount} accepted · {rejectedCount} rejected
            {tailorResult.rejected.length > 0 && (
              <span style={{ color: "#a60" }}> · {tailorResult.rejected.length} blocked by fact-grounding</span>
            )}
          </div>
        )}
      </div>

      {tailorResult && tailorResult.changes.length > 0 && (
        <div>
          <h3 style={{ marginTop: 0 }}>Proposed changes</h3>
          {tailorResult.changes.map((change) => (
            <ProposedChangeCard
              key={change.id}
              change={change}
              decision={decisions[change.id] ?? "pending"}
              onDecisionChange={(d) => setDecisions((prev) => ({ ...prev, [change.id]: d }))}
            />
          ))}
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={applyAccepted}
              disabled={applying || acceptedCount === 0}
              style={{
                padding: "0.6rem 1.2rem", fontSize: 14,
                background: acceptedCount === 0 ? "#888" : "#1a3",
                color: "white", border: "none", borderRadius: 4,
                cursor: acceptedCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              {applying ? "applying..." : `Apply ${acceptedCount} accepted change${acceptedCount === 1 ? "" : "s"}`}
            </button>
            {acceptedCount === 0 && (
              <span style={{ fontSize: 12, color: "#888" }}>
                Accept at least one change to apply.
              </span>
            )}
          </div>
        </div>
      )}

      {tailorResult && tailorResult.rejected.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "#a60" }}>Blocked by fact-grounding (tight mode)</h3>
          {tailorResult.rejected.map(({ change, reason }) => (
            <div key={change.id} style={{ ...cardStyle, background: "#fff5f5" }}>
              <div style={{ fontWeight: 600 }}>{change.summary}</div>
              <div style={{ fontSize: 12, color: "#a60", marginTop: 4 }}>rejected: {reason}</div>
              {change.before && (
                <div style={{ fontSize: 12, marginTop: 6, color: "#666" }}>
                  before: <code>{change.before}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function ProposedChangeCard(props: {
  change: ProposedChange;
  decision: "accepted" | "rejected" | "pending";
  onDecisionChange: (d: "accepted" | "rejected") => void;
}) {
  const { change, decision, onDecisionChange } = props;
  const accent = decision === "accepted" ? "#1a3" : decision === "rejected" ? "#a33" : "#888";
  return (
    <div style={{
      ...cardStyle,
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{change.summary}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{change.rationale}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onDecisionChange("accepted")}
            style={{
              padding: "0.3rem 0.6rem", fontSize: 12,
              background: decision === "accepted" ? "#1a3" : "white",
              color: decision === "accepted" ? "white" : "#1a3",
              border: "1px solid #1a3", borderRadius: 3, cursor: "pointer",
            }}
          >
            accept
          </button>
          <button
            onClick={() => onDecisionChange("rejected")}
            style={{
              padding: "0.3rem 0.6rem", fontSize: 12,
              background: decision === "rejected" ? "#a33" : "white",
              color: decision === "rejected" ? "white" : "#a33",
              border: "1px solid #a33", borderRadius: 3, cursor: "pointer",
            }}
          >
            reject
          </button>
        </div>
      </div>
      {change.before && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>before</div>
          <div style={{ fontSize: 13, background: "#f8f4f4", padding: 8, borderRadius: 3, marginTop: 2 }}>
            {change.before}
          </div>
        </div>
      )}
      {change.after && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>after</div>
          <div style={{ fontSize: 13, background: "#f0f7f1", padding: 8, borderRadius: 3, marginTop: 2 }}>
            {change.after}
          </div>
        </div>
      )}
      {change.source && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
          source: <code>{change.source.field}</code> — <em>{change.source.original}</em>
        </div>
      )}
    </div>
  );
}
function MatchScorePanel({ score }: { score: JdMatchScore }) {
  const pct = score.overlapPercent;
  // Color: red<40, orange<70, green>=70. Honest signal.
  const color = pct >= 70 ? "#1a3" : pct >= 40 ? "#a60" : "#b00020";
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>JD match score</h3>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>
          {pct}%
        </div>
      </div>
      <p style={{ color: "#666", fontSize: 13, margin: "0.25rem 0 0.75rem" }}>
        {score.matched.length} of {score.jdKeywords.length} keywords present in your resume.
        Missing keywords are candidates for new bullets or skill additions.
      </p>
      {score.matched.length > 0 && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 13 }}>
            matched ({score.matched.length})
          </summary>
          <div style={{ fontSize: 12, marginTop: 4, color: "#1a3" }}>
            {score.matched.join(", ")}
          </div>
        </details>
      )}
      {score.missingFromResume.length > 0 && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 13 }}>
            missing from resume ({score.missingFromResume.length})
          </summary>
          <div style={{ fontSize: 12, marginTop: 4, color: "#a60" }}>
            {score.missingFromResume.join(", ")}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            These keywords exist in the JD but not in your data bank.
            Run "Tailor with AI" or add the relevant skill/project
            to your data bank to address them.
          </div>
        </details>
      )}
    </div>
  );
}
