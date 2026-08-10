# CLAUDE.md — DemandRun

## What this project is

DemandRun is a demand-validation tool for indie builders. The promise: "You built the app. Now validate the demand." Users describe their app in ~60 seconds; DemandRun generates a hosted test landing page with signup tracking built in, then (M2+) launches real ad campaigns through the users' own ad accounts, manages them with a deterministic autopilot, and delivers a decision: CONTINUE, PIVOT, or STOP.

The repo currently contains **M1**, generated with Lovable: auth, project dashboard, a scripted setup chat, hosted public test pages at `/t/:slug` with UTM-attributed page views and signups, and a "campaigns coming soon" placeholder. Before building anything new, explore the codebase and verify the M1 acceptance checklist at the bottom of this file still passes.

## Stack

Lovable-generated frontend: Vite + React + TypeScript + Tailwind + shadcn/ui. Backend: Supabase (auth, Postgres with RLS, secrets). Do not introduce a second backend or ORM; extend the Supabase schema with migrations.

## Architecture principles — do not violate

1. **The LLM proposes, the rule engine disposes.** Any code path that launches, pauses, or moves ad budget must be deterministic and rule-driven. LLM calls may generate creatives, plans, and plain-English log lines — they must never directly trigger a spend-affecting API call.
2. **Hard caps live at the platform level.** When creating campaigns, always set the platform's lifetime budget to the test's allocated cap. Our monitoring is the second line of defense, never the only one.
3. **Users' money stays in users' ad accounts.** We store OAuth tokens (encrypted, minimal scopes), never payment methods. Never build anything that holds or transfers ad spend.
4. **Attribution is first-party.** Tracking runs through our hosted pages via UTM parameters (`utm_source` = channel, `utm_content` = ad variant id). Never add platform pixels to user test pages.
5. **Every remote mutation is logged.** Any call that changes campaign state writes an `autopilot_actions` row (structured params + a plain-English `human_log` line generated FROM the action record, never the other way around).
6. **RLS is sacred.** Public pages may INSERT `page_views` and `signups`; only the owning user may SELECT them. Never widen a policy to make a feature easier.

## Design system

Fonts: Space Grotesk (display/UI) + IBM Plex Mono (labels, data, metadata). Colors: paper `#F7F7F2`, ink `#16211C`, soft ink `#4A574F`, mist borders `#DDE3DC`, cards `#FFFFFF`, brand green `#0C8A5F`, deep green `#085041`, green tint `#E1F5EE`, amber `#C77F14`/`#FAEEDA`, red `#C0392B`/`#FAE7E4`. Verdict stamps (CONTINUE green / PIVOT amber / STOP red): mono, letter-spaced, 2.5px border, rounded, rotated ~-4deg. Cards 12–16px radius, dashed hairline dividers, mono uppercase micro-labels. No gradients, no stock imagery. If a screen looks like a generic admin template, it's wrong.

## Vocabulary (keep UI copy consistent)

"Validation" or "validation run" (never "test campaign" in user-facing copy), "decision" (not "report"), "autopilot" (the monitoring agent), "hard cap" (the budget limit), the three decisions: CONTINUE / PIVOT / STOP.

## Existing schema (M1)

`projects` (user_id, name, app_url, category, positioning jsonb) · `landing_pages` (project_id, slug unique, content jsonb, published) · `page_views` and `signups` (landing_page_id, utm_source, utm_campaign, utm_content; signups also email). See M2-PLAN.md for the tables M2 adds.

## Conventions for changes

- Schema changes only via Supabase migrations checked into the repo.
- Keep the public `/t/:slug` page dependency-light and fast; it must render without auth and without the app shell.
- Secrets (Meta app secret, token encryption key) live in Supabase secrets / environment variables — never in the repo.
- Prefer small, reviewable commits per task in M2-PLAN.md; run the acceptance checks for a task before moving to the next.
- When writing user-facing strings, match the tone of the setup chat: direct, warm, zero marketing jargon.

## M1 review findings (2026-08-10) — fix before public traffic

A security/code review of the Lovable-generated M1 found the RLS fundamentals sound (signup emails not publicly readable, unpublished pages hidden, no committed secrets) plus the following. Items 1–3 are fixed by the migration `20260810150000_fix_rls_review.sql` if present; items 4–5 are code changes:

1. FIXED BY MIGRATION: "public can read published pages" was `to anon` only — signed-in users saw "This page isn't live" on other users' published pages.
2. FIXED BY MIGRATION: `page_views`/`signups` inserts were `with check (true)`; now they require the target page to be published.
3. FIXED BY MIGRATION: added unique index `signups (landing_page_id, lower(email))` to prevent duplicate signups inflating conversion (and later, CPA).
4. TODO in `app/new.tsx`: `uniqueSlug` pre-checks via select, but RLS hides other users' unpublished slugs, so cross-user collisions crash creation. Catch insert error `23505` and retry with a short random suffix.
5. TODO in `t/$slug.tsx`: treat signup insert error `23505` as success (`setDone(true)`) — repeat submits of the same email must show "You're in. ✓", not an error.

Deferred, revisit in M2: anon clients can currently `select` ALL published pages (bulk enumeration of every customer's test page). Replace direct table select on the public page with a `security definer` RPC `get_page_by_slug(slug)` returning exactly one row, then drop the broad select policy.

## M1 acceptance checklist (regression guard)

1. New user signs up, completes setup chat, gets a live public page at `/t/<slug>`.
2. `/t/<slug>?utm_source=reddit&utm_content=angle-a` records a view with those values; form submit records a signup with them.
3. Project detail shows correct counts and per-source breakdown.
4. Unpublished pages are not publicly viewable; users never see other users' rows.
