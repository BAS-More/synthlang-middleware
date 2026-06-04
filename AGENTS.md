# AGENTS.md — operating contract for AI coding agents (Jules, etc.)

Agents read this file automatically. Your job is to FIX the issue, not introduce new ones — smallest change wins.

## Build / test / verify
- Install: `npm install`.
- Types: `npx tsc --noEmit` — the only static gate (no test suite exists).
- Deps: `npm audit` should stay clean.
- No test runner: prefer statically-verifiable changes; if a fix needs runtime proof, say so in the PR.

A change is not done until the build passes and the full existing test suite passes.

## Operating constraints
1. Smallest change; no unrelated refactors, reformatting, or renames.
2. Stay in scope; <= ~150 changed lines / <= 5 files. Larger -> stop and report for re-scoping.
3. Prove it: add a test that fails before / passes after; run the full suite; if anything fails, open NO pull request — report instead.
4. Preserve existing public APIs and behaviour unless the task explicitly changes them.
5. In the PR description, list every file changed and why, and the tests you added.

## Forbidden zones — STOP and report; never touch unless that IS the explicit task
Auth / authorization, payments / billing, secrets / credentials, database schema or migrations, CI / deploy / infrastructure config, adding new dependencies, any change to a public API or on-wire behaviour, and any branch that auto-deploys to production.

## If you cannot comply
If you cannot satisfy these constraints — or after genuine investigation you find no real issue — open NO pull request and report what you checked and what is blocking. Do not invent or manufacture work.
