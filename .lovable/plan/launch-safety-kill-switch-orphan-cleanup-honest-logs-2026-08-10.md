# Launch safety: kill switch, orphan cleanup, honest logs

Three fixes to the launch path in `src/lib/ads.functions.ts` so a live campaign can always be stopped, failed launches never leave anything running, and a double click can never double the spend.

## 1. Kill switch always finds the campaign

Today the `campaigns` row is written after the campaign is activated on Meta. If that write fails, money is being spent with no row to stop.

New order inside `launchTest`:

1. `adapter.createCampaign(...)` — everything created PAUSED (unchanged).
2. Insert the `campaigns` row immediately, with `status: "pending"`, storing `external_campaign_id` and the full refs object. If this insert fails, tear down and abort — nothing was ever activated.
3. `adapter.activate(refs)`.
4. Update that row to `status: "active"`.

So from the moment anything exists on Meta, a row exists to stop it.

## 2. Failed activation tears down and logs the truth

`activate()` gets the same guard `createCampaign()` already has:

- On throw, call `adapter.teardown(refs)` and record whether teardown succeeded.
- Mark the `campaigns` row `status: "stopped"` (or `"orphaned"` if teardown failed).
- The `human_log` line is derived from the recorded outcome, not assumed: teardown clean → "launch failed on meta · rolled back N ad sets, M ads · nothing left running"; teardown failed → "launch failed on meta · rollback incomplete · campaign <id> may still exist on meta · stop it from the dashboard". The `params` record carries the campaign id, counts, and the rollback flag so the log line can always be re-derived from the action record.
- The test returns to `status: "review"` only when rollback was clean; if rollback failed the test stays flagged so the stop action stays reachable.

## 3. Atomic double-launch guard

The `status === 'live'` read-then-write check loses the race. Replace it with a conditional claim before any Meta call:

```
update tests set status = 'launching'
where id = ? and status not in ('live','launching')
returning id
```

No row returned → someone else is already launching or it is live → throw "This validation is already launching". Only the winner proceeds; it sets `status = 'live'` after activation, or back to `review` on a clean rollback. The pre-existing plain `status === 'live'` check is removed.

## Also updated

- `stopTest` picks up `campaigns` rows in any non-stopped status (including `pending` and `orphaned`), so a half-launched campaign is stoppable, and clears a stuck `launching` test status.
- `stopTest` loads the adapter once instead of per campaign row.

## Technical notes

- The claim/release of `tests.status` uses the service-role client with an explicit `id` filter; ownership is still proven first by the RLS-scoped read of the test through `context.supabase`.
- No schema change needed: `campaigns.status` is free-form text; `tests.status` is free-form text.
- No UI change beyond the status pill already rendering unknown statuses; `launching` will read as-is in the project detail pill.
