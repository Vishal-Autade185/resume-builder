# Rules.md

Project-wide rules. Authoritative. Read before making any non-trivial decision. Add to the bottom; never silently rewrite existing rules — change history belongs in `context.md`.

---

## R1 — Phase independence

Each phase must work standalone. A later phase cannot depend on unfinished, broken, or reverted state of an earlier phase to function correctly.

In practice:

- A phase is "done" only when its own goal (§5 in `product.md`) is met and verifiable on its own — not because the next phase is in progress.
- Phase N's code, schema, or types must not assume that phase N-1 has merged in its final form. If phase N-1 is rolled back or partially reverted, phase N still builds, still typechecks, and still runs its own goal.
- Merging phase N to `main` does not break any prior phase's verified goal. If it would, that is a bug in phase N, not phase N-1.
- Refactors that cross phase boundaries (e.g. renaming a shared schema field) ship as their own scoped commit, not buried inside a phase-N feature commit, so a bisect can find them.

Why this rule exists: phases are rollback points (`v0.1-phase0`, `v0.2-phase1`, …). Coupling phases destroys the rollback story and turns every regression hunt into archaeology.

---

## R2 — Phase-bounded push

Only push to `origin/main` (the github remote) when a phase is **completely running** — meaning its goal (§5 in `product.md`) is met, verified, and the slice is genuinely usable on its own.

In practice:

- A phase is "completely running" only when, on a fresh checkout of that commit, you can exercise every success path the phase promises, not just compile/build cleanly.
- WIP commits, half-features, broken-by-design experiments, and "we'll fix it next phase" code stay on the local branch or in PRs — never on `main` once we've started tagging releases.
- If a phase turns out to need multiple commits, those commits form a single PR (or, if working solo on a phase branch, a single fast-forward to `main` once the goal is hit).
- Hotfixes outside a phase scope still go through normal phase flow: open the next phase boundary, don't bypass it.

Why this rule exists: `origin/main` is the deployment target and the rollback boundary. Polluting it with half-built phases makes every "what's actually deployed right now?" question a lie, and erodes trust in the `main` branch as the source of truth. Locally you can move as fast as you want; github sees only finished work.

---

