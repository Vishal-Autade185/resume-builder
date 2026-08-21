# Context.md — Resume Builder

Append-only project log. Decisions go here, not in chat. State (current phase, blockers, what's done) goes here so we can resume cleanly next session. Do NOT rewrite history: append new sections at the bottom. Edit the **State** section only when explicitly noting a state change.

---

## Project

Single-user AI-powered LaTeX resume tailoring platform. Stores career data once, tailors to any JD via BYOK (OpenAI / Anthropic / Google / NVIDIA NIM / local Ollama). Anti-hallucination by design: AI edits structured fields, never raw LaTeX. Diff/accept-reject before any change is applied.

Full spec: `product.md`.

---

## Stack (locked from product.md §3 + §4)

- **Frontend**: Next.js (App Router) on Vercel free tier.
- **DB + file storage**: Supabase (Postgres + Storage) — free tier. Schema migrations in repo at `supabase/migrations/`.
- **LaTeX compile service**: small Dockerized service on Render or Fly free tier, running `tectonic`. Sandbox: no network, resource limits, `--no-shell-escape`.
- **AI**: BYOK keys, called from backend. Provider + model selectable per task.
- **Web research**: Tavily or Google Programmable Search (custom search JSON API), free tier. Cached per company.
- **Monorepo**: pnpm workspaces.
  - `apps/web`
  - `services/compiler`
  - `packages/shared` (Data Bank, JD, Resume schemas)

---

## Conventions

- One branch per phase: `phase-0-foundation`, `phase-1-manual-tailoring`, etc. PR to `main` only when phase goal is met and preview-verified.
- Tag each merge: `v0.1-phase0`, `v0.2-phase1`, …
- Commits scoped per feature, not per phase.
- `rules.md` is authoritative for project rules — read it before making any non-trivial decision.
- `context.md` (this file) is the project memory — append-only.

---

## State

- **Current phase**: Phase 0 — Foundation (not started code-wise).
- **Repo**: local-only as of this commit. GitHub push pending `gh auth login`.
- **Local tools verified**: node 22.23.1, pnpm 9.15.0, git 2.43, gh installed.
- **Local tools missing**: docker (compile service will be dockerized for deploy but iterated locally without it until installed).

---

## Open Questions (from product.md §6, plus new ones)

- Do you have 1–2 LaTeX templates ready for Phase 0 test? (not blocking scaffold, blocking Phase 0 template work)
- Acceptable cold-start (~20–50s on first compile after idle) in dev?
- Supabase vs flat-file/SQLite — product.md suggests Supabase; not yet decided, Phase 0 may start with SQLite for speed.
- **New**: docker alternative for local compile iteration until you install docker desktop / enable WSL integration?

---

## Decision Log

### 2026-08-21 — Repo bootstrap

- Project reviewed from `product.md` (233 lines, 20.5 KB).
- Confirmed phase-by-phase build with human-in-the-loop at each phase boundary.
- Confirmed monorepo layout: `apps/web`, `services/compiler`, `packages/shared`.
- Confirmed product.md's recommendation to keep AI edits to structured fields, not raw LaTeX — accepted as the architectural baseline.
- Author `rules.md` deferred until you write the rules (skipped per user request).
- Git identity for this repo set locally to `Vishal-Autade185 <autadevishal185@gmail.com>` — does NOT overwrite global git config (which still points to a separate IITM coursework account).
- Default branch renamed `master` → `main` to match modern convention and Vercel defaults.
- `.gitignore` covers env files, `node_modules`, build output, generated PDFs from commit one.
- `README.md` is intentionally minimal; defers to `product.md` and `context.md`.
- `context.md` (this file) seeded.
- monorepo directories created as placeholders; actual app/complier/shared code lands in Phase 0 work.
- **BLOCKER**: `gh auth status` reports invalid token (`/home/vishal/.config/gh/hosts.yml`). Cannot create GitHub repo or push until user runs `gh auth login -h github.com`. Doing that is on the user.

