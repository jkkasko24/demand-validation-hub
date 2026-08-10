# M2 — Meta ad account connect, campaign launch, results

Goal: a user connects a Meta ad account, approves an auto-configured validation, and real campaigns launch with a hard budget cap. No autopilot, no cron, no verdicts — campaign state changes only when the user clicks launch or stop.

Adapted to this project's stack: all platform calls run in TanStack server functions (this app doesn't use edge functions), so Meta tokens never reach the browser. Everything else follows the uploaded plan.

## Decisions I'm making

- Meta credentials: I'll build the real Meta OAuth + Marketing API path and request `META_APP_ID`, `META_APP_SECRET`, `TOKEN_ENCRYPTION_KEY` as secrets. Until they exist, the Settings card reads "Meta not configured" instead of erroring, and launch is blocked.
- Scope: T1 through T4 (connect, adapter, product flow, manual insights refresh).
- Budget cap slider: $50–$500, step $10, default $100. The cap is enforced server-side — no adapter call may raise budget above it.

## What gets built

### 1. Data model
New tables: `ad_accounts`, `tests`, `campaigns`, `ad_variants`, `autopilot_actions`, `metric_snapshots`. Owner-only access, with grants; the stored OAuth token is encrypted and never selectable by the browser client (server-only reads).

### 2. Connect Meta (`/app/settings`)
- "Connect Meta" card: status, connected account name, disconnect (deletes the row).
- OAuth start + callback routes requesting `ads_management,ads_read`; the callback exchanges the code for a long-lived token, encrypts it, fetches `/me/adaccounts`, and lets the user pick the account to use.

### 3. Channel adapter
A single `ChannelAdapter` interface (`createCampaign`, `pauseAdSet`, `updateBudget`, `fetchInsights`, `teardown`) with a Meta implementation. No platform calls anywhere outside the adapter.

Meta behaviour: `OUTCOME_TRAFFIC` campaign with `lifetime_budget` = the test's cap, created PAUSED; one ad set per audience in the plan (geo/age/interests, schedule, optimize for link clicks); one ad per enabled variant, destination `…/t/<slug>?utm_source=meta&utm_campaign=<test_id>&utm_content=<variant_id>` so existing signup tracking attributes correctly. A final activate flips to ACTIVE. Any mid-creation failure tears down what was created and leaves the test in `review`. Every mutating call writes an `autopilot_actions` row with a plain-English log line.

### 4. Product flow
- Setup chat gains a budget-cap step, creating a `tests` row in `draft` plus three template ad variants from the positioning.
- New review screen: landing page card, angle toggles, channel/budget card (Meta 100%), guardrails card, "Approve & launch" → create + activate → `live`.
- Project detail gains a live section: status pill, spend-vs-cap bar, and the autopilot log.
- "Stop validation" kill switch → teardown → `stopped`. Works independently of the rest.

### 5. Results (manual refresh)
`fetchInsights` pulls impressions/clicks/spend per ad set and ad, daily, into `metric_snapshots`. A "Refresh data" button re-renders tiles: impressions, clicks, spend, signups, and cost per signup per variant (platform spend joined to our signup rows via `utm_content`).

## Not in this build

Autopilot rules and cron, verdict generation, Google/Reddit adapters, LLM or image-generated creatives, payments.

## Notes for you

Advanced access for `ads_management` needs Meta app review with a screen recording of the OAuth flow — worth submitting as soon as the connect flow is testable. Until then use a sandbox ad account and tester users; launches are safe and unbilled.
