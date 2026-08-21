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

