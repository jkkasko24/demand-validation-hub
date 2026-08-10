# M2 — Meta connect, validation setup, review, launch

Wires the new tables (`ad_accounts`, `ad_account_tokens`, `tests`, `ad_variants`, `campaigns`, `autopilot_actions`) into the app: connect a Meta ad account, configure a validation, approve it, and launch real campaigns with a platform-enforced hard cap. Autopilot rules and insights stay out (M3/T4).

## What you'll need from Meta

Before launch works end to end I need three values stored as backend secrets:

- `META_APP_ID` and `META_APP_SECRET` — from your Meta developer app (Business type, `ads_management` + `ads_read`).
- `TOKEN_ENCRYPTION_KEY` — I can generate this one automatically.

I'll ask for the two Meta values with the secure secret form once the OAuth callback URL exists, so you can paste the URL into the Meta app and the credentials here in one pass. Everything else (settings UI, setup chat, review screen, log) can be built and reviewed before those exist; launch will simply error until they're set.

## Screens and flow

1. **`/app/settings`** (new, auth) — "Connect Meta" card: status, connected account name, Connect button, Disconnect. After OAuth returns, a picker lists the user's ad accounts (`/me/adaccounts`) and saves the chosen one.
2. **`/app/new`** (extend) — after the existing questions, add a budget-cap step (slider + currency). Creates a `tests` row in `draft` plus three `ad_variants` rows from the positioning using static angle templates.
3. **`/app/project/:id/review/:testId`** (new, auth) — landing-page card, angle toggles (writes `ad_variants.enabled`), channel/budget card (Meta 100%), guardrails card (hard cap, end date, kill switch), "Approve & launch".
4. **`/app/project/:id`** (extend) — replaces the "coming soon" placeholder with a live validation section: status pill, hard-cap bar (static spend until T4), autopilot log from `autopilot_actions`, and a "Stop validation" button.

Design stays paper/ink: mono uppercase micro-labels, dashed hairline dividers, verdict stamps reserved for decisions (not shown yet).

## Technical approach

**No Edge Functions.** Meta tokens and Marketing API calls live in TanStack server functions (`.middleware([requireSupabaseAuth])`), with one public route for the OAuth redirect:

- `src/routes/api/public/meta/oauth/callback.ts` — exchanges `code` for a long-lived token, encrypts it, stores `ad_accounts` + `ad_account_tokens` via the service-role client, redirects back to `/app/settings`. State is a signed, short-lived value tying the callback to the user.
- `src/lib/meta.functions.ts` — `startMetaOAuth` (builds the authorize URL), `listAdAccounts`, `selectAdAccount`, `disconnectAdAccount`, `launchTest`, `stopTest`.
- `src/lib/meta.server.ts` — token encrypt/decrypt (AES-256-GCM with `TOKEN_ENCRYPTION_KEY`), Graph API fetch helper.
- `src/adapters/types.ts` + `src/adapters/meta.server.ts` — the `ChannelAdapter` interface from the plan (`createCampaign`, `pauseAdSet`, `updateBudget`, `fetchInsights`, `teardown`). No platform call happens outside an adapter.

**Launch semantics (per CLAUDE.md):**
- Campaign objective `OUTCOME_TRAFFIC`, `lifetime_budget` = the test's cap (hard cap enforced at Meta, not by us), created `PAUSED`, then a single `activate` flip.
- One ad set per audience in `plan` JSON; one ad per enabled variant, destination `https://<host>/t/<slug>?utm_source=meta&utm_campaign=<test_id>&utm_content=<variant_id>`.
- Any mid-creation failure triggers `teardown` of refs created so far and leaves the test in `review` — nothing orphaned.
- Every state-changing call writes an `autopilot_actions` row with a template-generated `human_log` derived from the action record.
- The rule engine, not the LLM, decides anything spend-affecting; ad copy here is static template text.

**Database:** two small migrations — writable policies for `ad_accounts` (owner INSERT/UPDATE), `campaigns` (owner insert/update via test→project), plus a `tests` DELETE-free stop path; and `plan`/`status` defaults if needed. Tokens stay service-role only.

## Out of scope

Autopilot rules and cron, insights/`metric_snapshots` and the refresh button, verdict generation, Google/Reddit adapters, LLM-generated creatives, payments.
