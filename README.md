# Resume Builder

AI-powered LaTeX resume tailoring platform. Single-user. BYOK (bring your own API key).

## Where to read first

- `product.md` — full product spec, feature list, phased build plan.
- `context.md` — append-only project log: decisions, state, blockers.
- `rules.md` — project-wide rules (created later, before code lands).

## Repo layout

```
apps/web            Next.js frontend + API routes (Vercel)
services/compiler   LaTeX compile service, Dockerized (Render/Fly)
packages/shared     Shared types/schemas (Data Bank, JD, Resume)
```

## Build phases

Phase 0 — Foundation (no AI). Manual Data Bank + one LaTeX template + PDF render.
Phase 1 — Manual tailoring + versioning.
Phase 2 — JD input + AI tailoring (core AI phase).
Phase 3 — Style controls, polish, company research.
Phase 3.5 — Template robustness checks.
Phase 4 — Chat-based live editing.
Phase 5 — Multi-template support.
Phase 6 — Nice-to-haves (cover letter, tracker, audit log, caching, redact mode, local model).

See `product.md` §5 for the full plan.