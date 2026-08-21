# Requirements.md — what you (user) need to provide for Phase 0

This is the **complete list** of things I need from your side to build, verify, and ship Phase 0. Each section has steps you can follow. I cannot do any of these for you — they require your accounts, your clicks, your data.

Phase 0 goal (from `product.md` §5): end-to-end manual resume build with **zero AI** — data bank + one LaTeX template + compile service + live PDF preview.

---

## Phase 0 — IMMEDIATE needs (block phase 0 from running end-to-end)

### R0.1 — Supabase project

Phase 0 uses Supabase for the Data Bank (Postgres) + Storage (for the template `.zip`). You picked this in our Q1, no going back without a phase rework.

**Steps:**

1. Go to https://supabase.com/dashboard and sign in / sign up. (Free tier is enough, no card needed.)
2. Click **"New project"**.
3. Fill in:
   - **Name**: `resume-builder` (or anything, this is just a label)
   - **Database password**: generate something strong, **save it somewhere safe** (1Password / a sticky note / your password manager — you'll need it if you ever go direct to the DB, but we won't for phase 0)
   - **Region**: pick whichever is geographically closest to you (us-east, ap-south, eu-west, etc. — affects latency)
4. Click **"Create new project"**. Wait ~2 minutes for provisioning.
5. Once the dashboard loads, go to **Project Settings → API** (gear icon, left sidebar).
6. Copy these three values into a message to me (or paste them into a `.env.local` file yourself if you prefer):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`anon` `public` key** — long JWT, starts with `eyJ...`
   - **`service_role` key** — long JWT, also starts with `eyJ...` ⚠️ **secret, never commit it**

**What I do with them:** write to `apps/web/.env.local` (gitignored), wire `@supabase/supabase-js` and `@supabase/ssr` clients, run the migration SQL I write for the data bank schema.

**What I need from you, in one message:** Project URL + anon key + service_role key. All three, in one paste.

---

### R0.2 — One LaTeX resume template (a `.zip` file)

Phase 0 has a single-template upload flow with a hand-built structured field map (per product.md §5). To test it end-to-end, I need **one** template `.zip` to upload as the phase 0 test fixture.

**Option A — you provide your own (preferred, most realistic):**

1. Find your existing LaTeX resume template. If it's a single `.tex`, zip it up:
   ```bash
   cd /path/to/your/template
   zip -r my-template.zip main.tex assets/ fonts/  # include any subfolders
   ```
   (Replace `main.tex` with your actual main file name.)
2. Drop the `.zip` anywhere on your filesystem and tell me the absolute path (e.g. `/mnt/c/Users/Vishal/Downloads/jake-resume.zip`).

**Option B — I pick a known-good public one:**

If you don't have a template handy, tell me "use a public template" and I'll use **Jake's Resume** from https://github.com/sanjay-thiyagarajan/jakes-resume (or similar — I'll pick at phase 0 build time). You'd still upload it via the UI as a real-user would, so the upload flow gets exercised.

**What I need from you, in one message:** either (A) the absolute path to your `.zip`, or (B) "use a public template."

---

### R0.3 — Sample Data Bank content for verification

To verify phase 0 end-to-end ("manually build one working resume"), I need to populate the Data Bank with at least one realistic record per entity type: personal info, education entry, experience entry, project entry, skill, certification.

**Option A — you provide your own (preferred, this is your career data, after all):**

Send me a text block or JSON with something like:

```
Personal:
  name: Vishal Autade
  email: ...
  phone: ...
  location: ...
  links: [github.com/Vishal-Autade185, linkedin.com/in/...]

Education:
  - institution: IIT Madras
    degree: BS Data Science
    start: 2023
    end: 2027
    gpa: ...
    details: ...

Experience:
  - company: ...
    role: ...
    start: ...
    end: ...
    bullets:
      - ...
      - ...

Projects:
  - name: ...
    description: ...
    tech: [...]
    link: ...

Skills:
  - Python, TypeScript, React, ...

Certifications:
  - ...
```

I won't put this in the database. I'll use it to seed the test fixtures so we render a real-looking resume in the PDF preview.

**Option B — I use a clearly-fake sample dataset:**

Tell me "use fake sample data" and I'll seed with `Jane Doe / Sample University / Sample Co / Sample Project / Python, JavaScript, …`. The PDF renders, the pipeline proves itself, but it's not your real resume.

**What I need from you, in one message:** either (A) your data (any format, I'll parse), or (B) "use fake sample data."

---

## Phase 0 — LATER needs (do NOT need these yet)

These gate **deployment**, not local phase 0. Get them when phase 0 is verified working locally and we're ready to deploy.

- **R0.4 — Vercel account** (free tier). https://vercel.com/signup. Needed when we deploy `apps/web`. Skip until I say "let's deploy."
- **R0.5 — Render or Fly.io account** (free tier). https://render.com or https://fly.io. Needed when we deploy `services/compiler`. Skip until I say "let's deploy."
- **R0.6 — Vercel + Render/Fly access tokens**. Created inside each dashboard once the accounts exist. Skip until deploy.

---

## Phase 1+ needs (do NOT need these yet)

- **R1.x — BYOK AI provider keys** (OpenAI / Anthropic / Google / NVIDIA NIM). Not until phase 2. Per `product.md` §2.4.
- **R1.y — Web search API key** (Tavily or Google Programmable Search). Not until phase 3. Per `product.md` §2.10.

---

## Phase 1 — DEPLOY + multi-device access needs

Phase 1 = Manual tailoring + versioning. No AI yet, but the app needs to actually deploy so you can use it from anywhere and save multiple resume versions.

- **R1.1 — Vercel account** (free tier). https://vercel.com/signup. Sign up with your github account.
- **R1.2 — Vercel access token**. https://vercel.com/account/tokens → "Create Token". Scope: full account, expiration: your call (90 days is reasonable). I use this for CI / future scripted deploys, but phase 1 we'll mostly point-and-click in the Vercel UI.
- **R1.3 — Vercel project setup** (a one-time web UI flow):
  1. https://vercel.com/new → "Import" your `Vishal-Autade185/resume-builder` repo.
  2. **Root Directory**: set to `apps/web` (not the repo root).
  3. **Framework Preset**: Next.js (auto-detected).
  4. **Environment Variables**: copy all the values from `apps/web/.env.local` (supabase url/keys + compiler service url).
  5. Click **Deploy**. ~2 min.
- **R1.4 — Render or Fly.io account** (free tier). https://render.com or https://fly.io. Render is simpler for a dockerized web service. Fly.io is faster cold-start but slightly more CLI-heavy.
- **R1.5 — Render/Fly API token**. Render: https://dashboard.render.com/u/settings → "API Keys" → "Create API Key". Fly: `fly tokens create`.
- **R1.6 — Render/Fly deploy** of `services/compiler`:
  1. Render: "New +" → "Web Service" → connect your `Vishal-Autade185/resume-builder` repo → root dir `services/compiler` → environment "Docker" → region near you → free plan.
  2. Note the deployed URL (e.g. `https://resume-compiler-xyz.onrender.com`). Add it as `COMPILER_SERVICE_URL` in Vercel env vars.
- **R1.7 — A label convention you want for resume versions**. Phase 1 saves versions linked to a "company / role" label (e.g. "Google — SWE Intern, 2026-08"). Default I'll use is `{company} — {role}, {YYYY-MM}`. Tell me if you want a different shape (e.g. include JD source filename).

**What I need from you for phase 1:** vercel account + token + one-time deploy setup. Render/Fly account + token + deploy of the compiler service. Total clicks: ~15 min.

---

## Phase 2 — BYOK AI + JD input needs

Phase 2 = JD input (text/pdf/docx) + AI tailoring. First phase that touches AI.

- **R2.1 — At least one AI provider API key**. You said BYOK, so you pick. Free / cheap tiers exist for all of these. Pick whichever you want, you can add more later:
  - **OpenAI**: https://platform.openai.com/api-keys. Models: `gpt-4o-mini` (cheap, fast, good for extraction), `gpt-4o` (better for rewriting). You add a payment method, get some free credits on first signup.
  - **Anthropic**: https://console.anthropic.com/settings/keys. Models: `claude-haiku-4-5` (cheap), `claude-sonnet-4-5` (stronger). Same — payment method required, signup credits.
  - **Google Gemini**: https://aistudio.google.com/apikey. **Has a free tier** — Gemini 2.0 Flash is free up to a daily quota, no card needed. Best starting choice if you want zero-cost.
  - **NVIDIA NIM**: https://build.nvidia.com. Free credits on signup, has hosted open-source models (Mistral, Llama, etc.). Less polished API but free.
- **R2.2 — Default model preferences**. Two places I'll need a model pick:
  - **Cheap/fast model** for keyword extraction, JD parsing, structured-field suggestions (called a lot).
  - **Strong model** for rewriting bullets, chat-driven edits, company research synthesis (called less often).
  
  Tell me: (a) provider(s) you'll set up, (b) which model you want for cheap tasks, (c) which for strong tasks. Or just say "use sensible defaults" and I'll pick (e.g. Gemini Flash for cheap, Claude Sonnet for strong).

**What I need from you for phase 2:** at least one API key + default model picks.

---

## Phase 3 — Style controls + company research needs

Phase 3 = polish + company research + JD match score.

- **R3.1 — Web search API key** (for §2.10 company research). Two options, both free tier:
  - **Tavily**: https://tavily.com. 1000 queries/month free. Built for AI agent workflows, returns clean structured results. Recommended.
  - **Google Programmable Search (Custom Search JSON API)**: https://programmablesearchengine.google.com. 100 queries/day free. More manual to configure (you set up a search engine, then an API key).
  - Tell me which one, or "either, your call."
- **R3.2 — Style preferences to enable by default**. §2.6 lists four toggles: Focus on Core, Quantify, No Orphans, ATS Best Practice. Tell me which you want ON by default for new resumes, or say "all on" or "all off." I won't make this call for you since it's about your resume taste.

**What I need from you for phase 3:** search API key + style defaults.

---

## Phase 4 — Chat-based editing needs

Phase 4 = chat panel for live editing.

- No new external service needs. Reuses phase 2's AI providers. Same diff/accept-reject system as everywhere else.
- **R4.1 — UX preference**: do you want a sticky pinned chat panel (always visible) or a toggleable side drawer that hides when not in use? My default: toggleable side drawer (more screen for preview), keyboard shortcut `Ctrl+K` to open.

**What I need from you for phase 4:** just the panel UX preference (toggleable vs pinned).

---

## Phase 5 — Multi-template support needs

Phase 5 = generalize the template parser, support multiple `.zip` templates, gallery, auto-parse + manual-confirm fallback.

- **R5.1 — Multiple LaTeX templates to upload**. You'll need at least 2-3 templates to test the gallery and the auto-parse fallback. Either:
  - Point me at templates you've collected (Dropbox folder / drive folder / local paths), or
  - Tell me "use a curated set" and I'll grab 3 well-known public ones (Jake's Resume, AltaCV, Deedy's resume, etc.).
- **R5.2 — Template naming/tagging convention**. How do you want to find a template later? Default: free-text name + tags (e.g. "academic", "industry-1page", "industry-2page", "creative"). Tell me if you want a different shape.

**What I need from you for phase 5:** template sources + naming/tagging convention.

---

## Phase 6 — Nice-to-haves (optional, pick what you want)

Phase 6 features in `product.md` are listed as "only if you still want them." Each can be skipped. Tell me which (if any) you want and which to drop.

- **R6.1 — Cover letter generator** (§2.14): same AI pipeline, plain text or PDF output. No external service needs beyond phase 2's.
- **R6.2 — Application tracker** (§2.15): no external needs. Local DB table, simple UI.
- **R6.3 — Export history / audit log** (§2.16): no external needs. Just stores more rows in your existing DB.
- **R6.4 — Prompt/response caching** (§2.17): no external needs. Code-only optimization for API cost. Optional — matters once usage is high.
- **R6.5 — Redact/anonymize export mode** (§2.19): no external needs. Pure export-time transform.
- **R6.6 — Local/offline fallback model** (§2.20): if you want this, you need:
  - **Ollama** installed locally: https://ollama.com/download. Pull a model: `ollama pull llama3.2` (or your pick).
  - Note: I noticed `/mnt/c/Users/Vishal/AppData/Local/Programs/Ollama` is already in your PATH from earlier — looks like you may already have it on the Windows side. Confirm and I'll wire it.

**What I need from you for phase 6:** which features you want (if any). No urgency.

---

## TL;DR — what I need from you, when

| Phase | What you give me | Type of work for you |
|---|---|---|
| **0** (now) | supabase url+keys, one template `.zip`, sample data bank content | ~5-15 min clicking |
| **1** (deploys) | vercel + render/fly accounts, deploys, version label convention | ~15 min clicking |
| **2** (first AI) | at least one AI provider API key, default model picks | ~5 min (or 0 if Gemini free tier) |
| **3** (polish + research) | web search API key, style toggle defaults | ~5 min |
| **4** (chat editing) | panel UX preference | text reply |
| **5** (multi-template) | multiple template sources, naming convention | file paths or "use curated" |
| **6** (optional) | which nice-to-haves to do | list reply |

**If you want to do it all in one go right now**: I can wait. But there's no real time saved — phase 0 doesn't need phase 1+ stuff, and providing phase 2 keys now doesn't make phase 0 work any sooner. Provisioning them just before their phase is usually cleanest.

---

## Where to give these to me

Just reply in chat with whatever you have. Format doesn't matter — paste raw, JSON, screenshot-of-dashboard, links, whatever's fastest for you. I'll parse it.