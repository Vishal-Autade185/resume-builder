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

## TL;DR — the only three things I need from you right now

1. **Supabase**: project URL + anon key + service_role key (after creating the project).
2. **One LaTeX template**: a `.zip` path, or "use a public template."
3. **Sample data bank content**: your real career data in any format, or "use fake sample data."

Once I have all three, phase 0 build proceeds without further blockers.

---

## Where to give these to me

Just reply in chat with the three items. Format doesn't matter — paste raw, JSON, screenshot-of-dashboard, whatever's fastest for you. I'll parse it.