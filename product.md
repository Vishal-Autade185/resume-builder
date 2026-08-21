# Product.md — AI-Powered LaTeX Resume Tailoring Platform

## 1. One-line pitch
A platform that stores your career data once, and uses AI (with your own API key, any provider) to tailor a LaTeX resume to any job description — with full manual control, live preview, versioning, and a chat-based editor — while refusing to invent facts about you.

---

## 2. Core Feature List (from your plan, organized)

### 2.1 Data Bank (the "source of truth")
- Structured, form-based storage for: personal info, education, work experience, projects, skills, certifications, publications, achievements.
- Each entity has **required fields** (e.g. Project → name, timeline, description, tech stack, quantified impact, link) so nothing is filled in loosely.
- Fully independent from any resume — this is your "career database," updated continuously as you grow, not tied to a job application.
- Add / edit / remove / archive items anytime.
- Tag items (e.g. by skill area, relevance, seniority) to help both manual and auto-selection later.

### 2.2 Template Management
- Upload multiple LaTeX resume templates as `.zip` (main `.tex` + assets/fonts/images/`.cls` files).
- Template gallery with thumbnail preview of rendered output.
- System parses each template's structure (sections, placeholders) so AI edits stay within known-safe boundaries instead of blindly rewriting raw LaTeX.

### 2.3 JD-Based Tailoring Engine
- **Multi-format JD input**: raw pasted text, `.pdf` upload, or `.docx` upload — all normalized to plain text before hitting the AI.
  - `.docx` → parsed client-side or server-side (e.g. `mammoth`) to extract text.
  - `.pdf` → text extraction (e.g. `pdf-parse` / `pdfjs`); if the PDF is a scanned image (rare for JDs but possible), fall back to a note asking for raw text instead of silently failing.
  - Raw text → used as-is.
  - All three converge into one internal `jobDescription` object so the rest of the pipeline never needs to know the original format.
- AI extracts key requirements, keywords, and role focus.
- **Auto-select mode**: AI proposes which projects/experiences/skills to include, based on relevance to the JD.
- **Manual override mode**: You toggle any section/item on or off yourself, anytime — auto suggestions are a starting point, not a lock.
- Hybrid mode: AI suggests + you approve/reject each change individually (diff-style).

### 2.4 AI Provider Settings (BYOK)
- Settings page to add your own API keys: OpenAI, Anthropic, Google (Gemini), NVIDIA NIM, etc.
- Dropdown to pick provider + model per generation task (e.g. use a cheap/fast model for keyword extraction, a stronger model for rewriting).
- Keys encrypted at rest, never logged, editable/removable anytime.

### 2.5 LaTeX Editing, Compilation & Preview
- In-app LaTeX source editor (syntax highlighting).
- AI-driven edits applied to the `.tex` source (constrained, see §4 Architecture Notes).
- Live/near-live compile-to-PDF preview pane.
- Graceful handling of compile errors (surface the LaTeX log, not just "failed").

### 2.6 Resume Style Controls
Selectable style directives that steer AI rewriting, e.g.:
- **Focus on Core** — trim to most relevant items only.
- **Quantify** — push every bullet toward a measurable outcome (%, $, time, scale).
- **No Orphans** — no single-line orphan/widow bullets or dangling section headers across page breaks.
- **ATS/Standard Best Practice** — action-verb-first bullets, consistent tense, no graphics-only content, standard section ordering, keyword alignment with JD.
- These should be toggleable checkboxes, not all-or-nothing.

### 2.7 Anti-Hallucination Guardrails
- AI is restricted to **only rephrase/reorder/select** from your Data Bank — never invent a company, metric, tool, or achievement.
- Any numeric claim not already present in your data (e.g. "improved performance by 40%") must be flagged for your confirmation before insertion, not silently added.
- Ideally: every AI-modified bullet is traceable back to a specific source field ("this claim comes from Project X, field: description").

### 2.8 Versioning
- Save multiple resume versions (e.g. by company, by role type).
- Each version linked to: template used, JD used, style settings used, data snapshot at time of generation.
- Version comparison/diff view.
- Duplicate a version as a starting point for a similar role.

### 2.9 Chat-Based Live Editing
- Side panel chat: "make the SWE Intern bullet more concise," "swap Project B for Project C," "shorten to one page."
- Chat edits apply directly to the LaTeX + preview updates live.
- Full undo/redo history of chat-driven changes.

### 2.10 Company Research & Personalization
- Given just a **company name** (and optionally the JD), AI does a web-research pass and uses findings to further tailor the resume — e.g. matching tone to company culture, emphasizing projects that align with their tech stack or product domain, echoing language from their engineering blog/mission statement.
- What it should research:
  - Company's product/domain (so project descriptions can be framed in relevant terms).
  - Tech stack, if public (from job posts, engineering blog, GitHub).
  - Company values/culture snippets (careers page, "about us") — used to *lightly* adjust tone, never to fabricate experience matching their values.
  - Recent news (funding round, major launch, pivot) — optional flavor for a cover letter, generally **not** injected into the resume itself.
- **Hard boundary**: this research may only influence *framing, emphasis, and word choice* of your real, existing Data Bank content — it must never add a skill, tool, or achievement you don't actually have just because the company uses/values it. This is the same fact-grounding constraint from §2.7, just fed by an extra research context instead of only the JD.
- Show the AI's research summary to you before it's applied ("Here's what I found about Company X, here's how I'm proposing to use it") — same diff/accept-reject pattern as the rest of the tool, so nothing is silently baked in from a possibly-wrong web result.
- Cache research per company (with a "refresh" button) so you're not re-researching the same company every time you apply to a similar role there.

### 2.11 JD Match Score / Gap Analysis
- Compute keyword/skill overlap % between your resume and the JD.
- Highlight high-value JD keywords that are missing from your resume (and, separately, missing from your Data Bank entirely — a signal you may want to add a skill/project later, not just word it differently).
- Show the score before and after AI tailoring, so you can see the tailoring actually helped.

### 2.12 One-Page / Two-Page Fit Detection
- Detect when compiled content overflows the target page count (you'll usually want a hard 1-page cap, sometimes 2 for senior/academic roles).
- On overflow, suggest specific trim candidates (least-relevant-to-JD bullet/project first, ranked using the same relevance scoring as auto-select in §2.3) rather than a generic "too long" warning.
- Also detect the opposite problem — noticeably empty page (too sparse) — and suggest what could be added back in.

### 2.13 Diff-Before-Apply
- Every AI-proposed change (content edit, section include/exclude, rewrite) is shown as a **before/after diff**, applied only after you accept it — never a silent overwrite.
- Accept/reject per line or per block, not just all-or-nothing per AI run.
- This is the same mechanism referenced in §2.3, §2.7, and §2.10 — it's really one system used everywhere the AI touches your resume, so it only needs to be built once (see Phase 2).

### 2.14 Cover Letter Generator
- Reuses the Data Bank + JD (+ optional company research from §2.10) pipeline — minimal extra work once the resume engine exists.
- Same fact-grounding constraint: no invented experience, same diff/accept-reject review before finalizing.
- Own lightweight template system (plain text/PDF, doesn't need the full LaTeX template machinery unless you want a styled letter).

### 2.15 Application Tracker
- Lightweight log: which resume **version** was sent to which **company**, on what **date**, against which **JD**.
- Simple status field (applied / interviewing / rejected / offer) — optional, just enough to answer "wait, what did I send them?" six weeks later.
- Since you're already storing versions (§2.8), this is mostly a thin UI over data you're already generating.

### 2.16 Export History / Audit Log
- Every exported PDF is logged with: timestamp, version, template, style settings used, and a diff summary vs. the previous export of that version.
- Lets you answer "what actually changed between the resume I sent Monday and the one I sent Friday" without manually comparing PDFs.

### 2.17 Prompt / Response Caching
- Cache AI outputs per (Data Bank item + style settings + JD-relevant-context) combination, so editing one bullet doesn't trigger re-generation (and re-billing) of unrelated sections.
- Invalidate cache automatically when the underlying Data Bank item or style settings actually change.
- Mainly an API-cost optimization — matters more as you use the tool more, safe to defer past MVP.

### 2.18 Template Compatibility Checker
- When a new `.zip` template is uploaded, check it against your Data Bank's expected sections (Education, Experience, Projects, Skills, etc.).
- Warn if the template is missing a section your data expects, or has a section your data has nothing for — before you try to generate a resume and get a confusing empty block.
- Pairs naturally with the template auto-parsing work in Phase 5.

### 2.19 Redact / Anonymize Mode
- One-click export variant that strips personal contact info (name, email, phone, address, links) — useful for sharing a draft resume publicly (e.g. posting for feedback, a portfolio review) without doxxing yourself.
- Doesn't touch the stored Data Bank — it's purely an export-time transform.

### 2.20 Local / Offline Fallback Model (optional)
- For days you don't want to burn API credits, or want to work without network access to a paid provider, allow pointing the model dropdown (§2.4) at a **local model** via Ollama or similar.
- Purely optional — quality will generally be lower than frontier hosted models, so treat it as a fallback/testing mode, not the default.

---

## 3. Hosting Strategy (Free Tier, Single User)

Since this is single-user, you don't need heavy infra — but LaTeX compilation is the one piece that doesn't fit neatly into a pure serverless free tier (needs a real filesystem, a TeX engine, and more than a few seconds of CPU time). Recommended split:

| Piece | Suggested free service | Why |
|---|---|---|
| Frontend (Next.js/React) | **Vercel** free tier | Generous free tier, zero-config Next.js hosting, instant deploys. |
| Auth | Skip full auth system — single password/env-var gate, or **Supabase Auth** free tier if you want a real login screen | You're the only user; don't over-engineer auth. |
| Database (Data Bank, versions, metadata) | **Supabase** free tier (Postgres) | Free Postgres + generous row limits, good enough for one user's career data indefinitely. |
| File storage (template `.zip`s, generated PDFs) | **Supabase Storage** free tier | Bundled with the same Supabase project; simple. |
| LaTeX compile service | Small Dockerized service on **Render free web service** or **Fly.io free allowance**, running `tectonic` (lightweight, self-fetching TeX engine — much smaller than full TeX Live) | Vercel serverless functions have execution-time and package-size limits that don't play well with LaTeX engines; a separate small always-on-ish container handles this better. |
| AI calls | Made directly from your backend using your own BYOK keys | No hosting cost beyond your own API usage. |
| Company research (web search) | **Tavily** or **Google Programmable Search (Custom Search JSON API)** free tiers (~100–1000 queries/day) | Needed for §2.10 company research; both have workable free quotas for single-user, occasional use. Some model providers (e.g. Anthropic, Google) also offer native web-search tool-use, which can substitute for a separate search API if you're already using that provider. |

**Trade-offs to accept with free tiers**: Render/Fly free services typically spin down when idle and have a cold-start delay (~20–50s) on the first compile after inactivity — fine for a personal tool used a few times a week, annoying if you want instant every time. If that becomes a problem later, a $5–7/mo always-on tier removes it — but not needed to start.

### 3.1 Concrete Setup Steps (GitHub-connected, so every push deploys)

1. **Repo structure** — use a single monorepo, not separate repos per service. Simpler to keep in sync across phases:
   ```
   /apps/web            → Next.js frontend + API routes (deploys to Vercel)
   /services/compiler   → LaTeX compile service, Dockerized (deploys to Render/Fly)
   /packages/shared     → shared types (JD schema, Data Bank schema, etc.)
   ```
2. **Vercel** — import the GitHub repo directly in the Vercel dashboard, set the **root directory** to `apps/web`. Every push to `main` auto-deploys to production; every PR gets its own free **preview URL** — genuinely useful here since you can review a phase's changes live before merging.
3. **Render/Fly** — same idea: connect the GitHub repo, point the service at `services/compiler`, and set it to auto-deploy on push to `main` (or a `deploy/compiler` branch if you want the two services to deploy independently rather than in lockstep).
4. **Supabase** — not GitHub-deployed (it's a managed DB), but Supabase supports **migration files checked into your repo** (`supabase/migrations/`) so schema changes are versioned alongside code, not made ad hoc in the dashboard.
5. **Environment variables / secrets** — never commit `.env` files. Set BYOK API keys, Supabase keys, and search API keys directly in each platform's dashboard (Vercel → Project Settings → Environment Variables; Render → Environment tab). Add `.env*` to `.gitignore` from commit one.
6. **Branch protection** (optional but cheap insurance even solo) — require `main` to only update via PR, so every phase's changes get a preview deploy and a final look before going live.

### 3.2 Git Workflow Per Phase
- One branch per phase: `phase-0-foundation`, `phase-1-manual-tailoring`, `phase-2-ai-tailoring`, etc. — matches the roadmap in §6.
- Merge to `main` only when that phase's "Goal" (stated in each phase below) is actually met and manually verified via the Vercel preview URL.
- Tag each merge: `git tag v0.1-phase0`, `v0.2-phase1`, … — gives you a rollback point if a later phase's AI-integration work breaks something that was working before.
- Keep commits scoped to one feature within a phase (e.g. separate commits for "Data Bank forms" vs "template parser") rather than one giant commit per phase — makes it far easier to bisect if a regression shows up later.

---

## 4. Architecture Notes / Critique (important — please read)

- **Don't let the AI freely rewrite raw LaTeX end-to-end.** LaTeX is fragile — a hallucinated brace or macro breaks compilation. Better approach: parse each template into a **structured schema of editable fields** (sections → items → sub-fields), let AI edit *content* in that structured layer, and have your own renderer inject that content back into the LaTeX template. This also solves your "AI shouldn't hallucinate" requirement — if the AI can only choose/rephrase from Data Bank fields (not write arbitrary LaTeX), hallucination risk drops sharply and compile errors nearly disappear.
- **Sandboxed compilation is mandatory.** Since a `.zip` template + AI-modified `.tex` gets compiled server-side, treat this as untrusted input — run `tectonic`/`latexmk` in an isolated container with no network access and resource limits (LaTeX has known shell-escape/RCE footguns via packages like `\write18`).
- **API key storage** — encrypt at rest (e.g. KMS-backed), never send keys to your own logs/analytics, allow per-key rotation.
- **Fact-grounding, concretely**: Consider a lightweight RAG-style constraint — every generation call is given *only* the specific Data Bank fields being used as context, with an explicit instruction "you may reorder/rephrase but not add new facts," and a post-generation validator that checks numbers/entities in the output exist in the input.
- **Scope is large** — see the phased roadmap below (§5) for a concrete build order that de-risks the hardest part (AI + LaTeX reliability) early.

---

## 5. Phased Build Plan

### Phase 0 — Foundation (no AI yet)
- Set up Next.js on Vercel, Supabase project (DB + storage).
- Build the **Data Bank**: forms for personal info, education, experience, projects, skills, with required-field validation.
- Upload **one** LaTeX template (`.zip`), parse it into a structured field map manually for this one template.
- Render that template + your data into a PDF via the compile service (Render/Fly + tectonic). Live preview pane.
- **Goal**: you can manually build one working resume end-to-end with zero AI involved.

### Phase 1 — Manual Tailoring
- Section/item toggling per resume (include/exclude project X, experience Y).
- Save a resume as a **version** (template + selected items + generated PDF, linked to a company/JD label).
- Version list + duplicate-as-new-version.
- **Goal**: full manual tailoring + versioning works, still no AI.

### Phase 2 — JD Input + AI Tailoring (core AI phase)
- JD input: raw text, `.pdf`, `.docx` — normalized to text.
- Settings page: BYOK API keys (OpenAI/Anthropic/Google/NVIDIA NIM) + model dropdown.
- AI reads JD + Data Bank → proposes which items to include/exclude and rephrases bullets, constrained to structured fields only (no raw LaTeX generation).
- **Diff/accept-reject UI** (§2.13): every AI suggestion shown as a proposed change you approve or reject, per line — this is the one shared mechanism used everywhere the AI touches your resume, built once here.
- Fact-grounding check: flag any number/entity in AI output not traceable to a Data Bank field.
- **Goal**: the core "JD in, tailored resume suggestion out" loop works and is trustworthy.

### Phase 3 — Style Controls, Polish & Company Research
- Add toggles: Focus on Core, Quantify, No Orphans, ATS Best Practice.
- One-page/overflow detection + trim suggestions (§2.12).
- JD match/keyword-gap score (§2.11).
- Company research pass (§2.10): search API integration, research summary shown before use, same diff/accept-reject pattern, per-company caching.
- **Goal**: output quality reaches "actually good enough to send," and tailoring reflects the target company, not just the JD text.

### Phase 3.5 — Template Robustness
- Template compatibility checker (§2.18): warn when an uploaded template is missing a section your Data Bank expects, or vice versa.
- **Goal**: catch template/data mismatches before a broken or confusingly-empty resume gets generated.

### Phase 4 — Chat-Based Live Editing
- Chat panel wired to the same structured-field constraint + diff/accept-reject system.
- Undo/redo history for chat-driven edits.
- **Goal**: fast, conversational micro-edits without leaving the preview.

### Phase 5 — Multi-Template Support
- Generalize the template parser (Phase 0 was hand-built for one template) so new `.zip` uploads are auto-mapped to the structured schema, with a fallback UI to manually confirm/adjust the mapping if auto-parsing misses a section.
- Template gallery with thumbnails.
- **Goal**: drop in any reasonably-standard LaTeX resume template and use it immediately.

### Phase 6 — Nice-to-haves (optional, only if you still want them)
- Cover letter generator (§2.14).
- Application tracker (§2.15).
- Export history / audit log (§2.16).
- Prompt/response caching (§2.17) — API cost optimization, worth doing once usage is high enough to matter.
- Redact/anonymize export mode (§2.19).
- Local/offline fallback model (§2.20) — optional, lowest priority of the batch.

---

## 6. Open Questions for You
- Do you already have 1–2 LaTeX templates you plan to use as the initial Phase 0 test case?
- For the free-tier cold-start trade-off (§3) — acceptable, or is snappy/instant compilation a hard requirement even in early phases?
- Any preference between Supabase vs. a simpler flat-file/SQLite approach for the Data Bank, given it's single-user and low-volume?
