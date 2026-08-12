# M2-PLAN.md — Meta adapter & campaign launch

Goal of M2: a user can connect their Meta ad account, approve an auto-configured validation, and have real campaigns launch with a platform-enforced hard cap. Monitoring/autopilot is M3 — in M2, campaign state changes only via explicit user actions (launch, stop).

Read CLAUDE.md first. Work the tasks in order; each has its own acceptance check.

## T0 — prerequisites (human tasks, do these outside the code)

- Create a Meta developer app (Business type). Request `ads_management` and `ads_read` permissions. Note: advanced access requires Meta app review with a screen recording of the OAuth flow — build T1 first, record it, submit early because review takes days-to-weeks. Until approved, everything works in dev mode for accounts added as testers.
- Create a Meta **sandbox ad account** for development — it accepts campaign API calls without spending money.
- Add secrets to Supabase: `META_APP_ID`, `META_APP_SECRET`, `TOKEN_ENCRYPTION_KEY`.

## T1 — schema + OAuth connect

New tables (migration):

```sql
ad_accounts (id, user_id, platform text default 'meta',
             external_account_id text, account_name text,
             oauth_token_encrypted text, token_expires_at timestamptz,
             scopes text[], created_at)

tests      (id, project_id, status text,            -- draft|review|live|stopped|done
            budget_cap_cents int, currency text default 'usd',
            starts_at, ends_at, target_cpa_cents int, plan jsonb, created_at)

campaigns  (id, test_id, ad_account_id, platform,
            external_campaign_id text, external_adset_ids jsonb,
            budget_split_pct int, status text, created_at)

ad_variants(id, test_id, angle_name text, headline text, body text,
            image_url text, enabled bool default true)

autopilot_actions (id, test_id, action_type text, params jsonb,
                   human_log text, executed_at timestamptz default now())
```

Build the OAuth flow in a Supabase Edge Function pair: `/meta/oauth/start` (redirect with scopes `ads_management,ads_read`) and `/meta/oauth/callback` (exchange code → long-lived token → encrypt → store, fetch the user's ad accounts via `/me/adaccounts` and let them pick one). UI: a "Connect Meta" card on a new `/app/settings` route showing connection status and the connected account name.

**Accept when:** a tester account completes the flow; the token is stored encrypted; disconnecting deletes the row.

## T2 — the channel adapter interface + Meta implementation

Create `src/adapters/types.ts` with the interface (all channels implement this — never call platform SDKs outside an adapter):

```ts
interface ChannelAdapter {
  createCampaign(test: Test, plan: ChannelPlan, variants: AdVariant[]): Promise<ExternalRefs>
  pauseAdSet(ref: AdSetRef): Promise<void>
  updateBudget(ref: AdSetRef, newBudgetCents: number): Promise<void>  // reallocation only, never above cap
  fetchInsights(refs: ExternalRefs, since: Date): Promise<MetricRow[]>
  teardown(refs: ExternalRefs): Promise<void>
}
```

Meta implementation (Marketing API, in an Edge Function — tokens never reach the browser):
- Campaign: objective `OUTCOME_LEADS` equivalent for link clicks to external site (use `OUTCOME_TRAFFIC` for MVP simplicity), **`lifetime_budget` = the test's Meta share of the cap**, `status: PAUSED` on creation.
- One ad set per audience in the plan: targeting from plan JSON (geo, age, interests), schedule = `starts_at`..`ends_at`, optimization goal link clicks.
- One ad per enabled variant per ad set: creative with headline/body/image, destination URL `https://<page>/t/<slug>?utm_source=meta&utm_campaign=<test_id>&utm_content=<variant_id>`.
- Everything created paused; a final `activate` call flips campaign to ACTIVE. Creation is transactional in effect: on any failure, call `teardown` on refs created so far, surface the error, leave the test in `review`.
- Every adapter call that mutates state writes an `autopilot_actions` row (action_type: `launch`, `stop`, etc.) with a template-based `human_log` ("launched 2 ad sets, 3 ads on meta · lifetime budget $70 · locked").

**Accept when:** against the sandbox account, approving a test creates campaign + ad sets + ads with correct lifetime budget and UTM'd URLs, visible in Meta Ads Manager; a forced mid-creation failure leaves nothing orphaned.

## T3 — wire the product flow

- Extend the setup chat: after the M1 questions, add the budget cap slider (creates a `tests` row in `draft`, generates 3 ad variant rows from the positioning — static template text for now, LLM generation comes later).
- Build the review screen per the MVP prototype design: landing page card, angle toggles (writes `ad_variants.enabled`), channel/budget card (Meta 100% for now), guardrails card, "Approve & launch" → adapter `createCampaign` + activate → test `live`.
- Project detail gains a live section: status pill, spend-vs-cap bar (static until T4), and the autopilot log rendered from `autopilot_actions`.
- A "Stop validation" button → `teardown` → status `stopped`. This is the kill switch; it must work even if other things are broken.

**Accept when:** the full path — chat → review → approve → live in Ads Manager → stop — works end-to-end on the sandbox account, and every state change appears in the log.

## T4 — insights pull (manual refresh)

Implement `fetchInsights` (impressions, clicks, spend per ad set and per ad, daily granularity) and a `metric_snapshots` table + a "Refresh data" button on the dashboard that calls it and re-renders tiles: impressions, clicks, spend, signups (joined from M1 tables via utm_content), cost per signup per variant. Cron automation of this is M3 — the button proves the pipe.

**Accept when:** after generating sandbox activity, refresh shows consistent numbers and per-variant CPA computes from platform spend + our signup rows.

## Deferred (do not build in M2)

Autopilot rules and cron (M3) · verdict generation (M4) · Google/Reddit adapters (M5) · LLM-generated creatives · image generation · payments.

## Suggested first Claude Code session

"Read CLAUDE.md and M2-PLAN.md. Explore the repo and summarize the current structure, routes, and Supabase schema. Verify the M1 acceptance checklist items that can be checked from code (RLS policies, UTM capture). Then propose the migration for T1 before writing it."
