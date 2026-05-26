# DOCS_REORG — P2 D4 + D5 + D6

Documentation reorganization to address P2-medium items D4 (stray root docs),
D5 (`research_notes/` 200 KB dump at root), and D6 (`owner_user_id`
deprecation plan missing from `database.md`).

## File moves

| From (repo root) | To |
|---|---|
| `database.md` | `docs/architecture/database.md` |
| `scheduling.md` | `docs/architecture/scheduling.md` |
| `scheduling-state-schema.md` | `docs/architecture/scheduling-state-schema.md` |
| `database-schema.sql` | `docs/legacy/database-schema.sql` |
| `review-session-refactor-plan.md` | `docs/legacy/review-session-refactor-plan.md` |
| `llm.txt` | `docs/legacy/llm.txt` |
| `research_plan.md` | `docs/research/research_plan.md` |
| `anki-like-memory-learning-system-sources.md` | `docs/research/anki-like-memory-learning-system-sources.md` |
| `research_notes/` (10 files) | `docs/research/notes/` |

All moves performed via `git mv` to preserve history. Kept at root:
`AGENTS.md`, `README.md`.

## Archive vs delete decisions

- `database-schema.sql` — **archived**, not deleted. Documents the pre-Firestore
  PostgreSQL/Supabase schema. Git history preserves it, but keeping it in the
  tree under `docs/legacy/` makes it discoverable for archaeology while
  removing the misleading top-level placement.
- `review-session-refactor-plan.md` — **archived**. The refactor described
  has shipped (see commit `56b609d refactor: share sm2 review session setup`),
  but the plan documents the design intent and trade-offs.
- `llm.txt` — **archived**, not deleted. Grep showed no code references (only
  a mention in the P2 review doc itself). It is a pre-Firestore design brief
  (claims "built on IndexedDB"), so archived under `docs/legacy/` rather than
  kept at root or deleted outright.

## New documents

- `docs/README.md` — top-level documentation index.
- `docs/research/README.md` — note that research material is historical and
  not authoritative for current behavior.

## Link updates

Updated internal references in:

- `README.md` (repo root) — three updates: replaced the "will be consolidated"
  note with a pointer to `docs/README.md`; updated the Documentation section
  to link to the new `docs/architecture/` paths.
- `docs/architecture/database.md` — updated the inline reference to
  `database-schema.sql` to point to `../legacy/database-schema.sql`.
- `docs/research/research_plan.md` — updated `research_notes/` mention to
  `notes/` (now a sibling subdirectory).

Out-of-scope references were intentionally left alone:

- `docs/review/2026-05-26/P2-medium.md` — the review document itself
  references the old paths; per the task boundaries we do not edit review
  content.
- `docs/superpowers/plans/2026-05-25-project-review-refactor-guardrails.md` —
  active planning artifact; not modified.

`docs/architecture/scheduling.md` references its sibling
`scheduling-state-schema.md` — still resolves correctly (same directory).

## D6 — `owner_user_id` deprecation plan

Added a new "Deprecation: `owner_user_id`" section to
`docs/architecture/database.md`:

> `owner_user_id` is retained on legacy local-IndexedDB records for backward
> compatibility with the pre-cloud model. For records written via the cloud
> repositories it equals the active profile id and is redundant with
> `profile_id` / `learner_profile_id`.
>
> **Plan**: a future data migration will populate `profile_id` on any legacy
> records still keyed only by `owner_user_id`, after which new writes will
> drop the field. Until then, both reads and writes should prefer
> `profile_id` / `learner_profile_id`.
>
> **Tracking**: see `../review/2026-05-26/P2-medium.md` #14.

## Verification

- `git status` shows all renames staged.
- Re-ran the cross-reference grep; only intentional updated links remain.
- No code (`*.ts`/`*.tsx`) modified; pure documentation reorganization.
