# Add reference docs: CLAUDE.md and M2-PLAN.md

Copy the two uploaded documents to the repo root, byte-for-byte, as reference documentation for future sessions.

## What happens

- `CLAUDE.md` at the repo root — exact content of the uploaded `CLAUDE-2.md`
- `M2-PLAN.md` at the repo root — exact content of the uploaded `M2-PLAN-3.md`

## Rules for this change

- Content is copied verbatim: no edits, reformatting, summarizing, or renaming of headings.
- The documents are treated as inert reference text. Nothing described inside them is implemented, changed, or "fixed" as part of this change.
- No other file in the project is touched, and no database or configuration changes are made.

## Technical notes

Both files are copied from the read-only upload mount into the project root, then their line counts and first/last lines are checked against the source to confirm the copies are complete and unmodified.
