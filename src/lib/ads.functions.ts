import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AdVariant, ChannelPlan, MetricRow, Test } from "@/adapters/types";

function origin(): string {
  const request = getRequest();
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${forwardedHost ?? url.host}`;
}

export const getMetaConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadConnection, metaConfigured } = await import("@/lib/ads.server");
    const connection = await loadConnection(context.userId);
    return {
      configured: metaConfigured(),
      connected: Boolean(connection),
      account_id: connection?.external_account_id ?? null,
      account_name: connection?.account_name ?? null,
      page_id: connection?.external_page_id ?? null,
      page_name: connection?.page_name ?? null,
    };
  });

export const getMetaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { metaAppCredentials } = await import("@/lib/ads.server");
    const { signState } = await import("@/lib/crypto.server");
    const { appId } = metaAppCredentials();
    const redirectUri = `${origin()}/api/public/meta/callback`;
    const state = await signState({ uid: context.userId, exp: Date.now() + 10 * 60 * 1000 });

    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "ads_management,ads_read,pages_show_list");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return { url: url.toString() };
  });

export const listMetaAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadConnection, loadAccessToken } = await import("@/lib/ads.server");
    const { listMetaAssets: fetchAssets } = await import("@/adapters/meta.server");
    const connection = await loadConnection(context.userId);
    if (!connection) return { accounts: [], pages: [] };
    const token = await loadAccessToken(connection.id);
    return fetchAssets(token);
  });

export const selectMetaAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    account_id: string;
    account_name: string;
    page_id: string | null;
    page_name: string | null;
  }) => data)
  .handler(async ({ data, context }) => {
    const { loadConnection } = await import("@/lib/ads.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const connection = await loadConnection(context.userId);
    if (!connection) throw new Error("Connect a Meta account first.");
    const { error } = await supabaseAdmin
      .from("ad_accounts")
      .update({
        external_account_id: data.account_id,
        account_name: data.account_name,
        external_page_id: data.page_id,
        page_name: data.page_name,
      })
      .eq("id", connection.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadConnection } = await import("@/lib/ads.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const connection = await loadConnection(context.userId);
    if (!connection) return { ok: true };
    await supabaseAdmin.from("ad_account_tokens").delete().eq("ad_account_id", connection.id);
    await supabaseAdmin
      .from("ad_accounts")
      .delete()
      .eq("id", connection.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

function defaultPlan(): ChannelPlan {
  return {
    budget_split_pct: 100,
    audiences: [
      { name: "Broad — US 25-54", geo: ["US"], age_min: 25, age_max: 54, interests: [] },
    ],
  };
}

export const launchTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { testId: string }) => data)
  .handler(async ({ data, context }) => {
    const { metaAdapterFor, logAction, money } = await import("@/lib/ads.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // RLS-scoped read: proves the caller owns this test.
    const { data: test, error } = await context.supabase
      .from("tests")
      .select(
        "id, project_id, status, budget_cap_cents, currency, starts_at, ends_at, target_cpa_cents, plan, projects(id, landing_pages(slug, published))",
      )
      .eq("id", data.testId)
      .single();
    if (error || !test) throw new Error("Validation not found");

    const page = test.projects?.landing_pages?.[0];
    if (!page) throw new Error("This project has no test page yet");

    const { data: variantRows } = await context.supabase
      .from("ad_variants")
      .select("id, angle_name, headline, body, image_url, enabled")
      .eq("test_id", test.id);
    const variants: AdVariant[] = variantRows ?? [];

    const plan = (test.plan as ChannelPlan | null) ?? defaultPlan();
    // Hard cap: the channel share can never exceed the test's budget cap.
    plan.budget_split_pct = Math.min(100, Math.max(1, plan.budget_split_pct ?? 100));

    const payload: Test = {
      id: test.id,
      project_id: test.project_id,
      budget_cap_cents: test.budget_cap_cents,
      currency: test.currency,
      starts_at: test.starts_at,
      ends_at: test.ends_at,
      target_cpa_cents: test.target_cpa_cents,
      destination_url: `${origin()}/t/${page.slug}`,
    };

    const { adapter, connection } = await metaAdapterFor(context.userId);

    // Atomic claim: only one caller can move the test out of a stoppable state,
    // so a double click can never create two funded campaigns.
    const { data: claimed } = await supabaseAdmin
      .from("tests")
      .update({ status: "launching" })
      .eq("id", test.id)
      .not("status", "in", '("live","launching")')
      .select("id");
    if (!claimed || claimed.length === 0) {
      throw new Error("This validation is already launching or live");
    }

    // Everything below is created PAUSED first, recorded in the database, and
    // only then activated — the kill switch can always find what is running.
    const refs = await adapter
      .createCampaign(payload, plan, variants)
      .catch(async (err: unknown) => {
        await supabaseAdmin.from("tests").update({ status: "review" }).eq("id", test.id);
        await logAction(
          test.id,
          "launch_failed",
          `launch failed on meta while building the campaign · nothing was activated · ${err instanceof Error ? err.message : "unknown error"}`,
        );
        throw err;
      });

    const { data: campaignRow, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        test_id: test.id,
        ad_account_id: connection.id,
        platform: "meta",
        external_campaign_id: refs.campaign_id,
        external_adset_ids: refs as never,
        budget_split_pct: plan.budget_split_pct,
        status: "pending",
      })
      .select("id")
      .single();

    if (campaignError || !campaignRow) {
      // Nothing is active yet: remove what was built so no orphan can ever spend.
      let rolledBack = true;
      try {
        await adapter.teardown(refs);
      } catch {
        rolledBack = false;
      }
      await supabaseAdmin
        .from("tests")
        .update({ status: rolledBack ? "review" : "attention" })
        .eq("id", test.id);
      await logAction(
        test.id,
        "launch_failed",
        rolledBack
          ? `launch aborted before activation · could not record the campaign · rolled back ${refs.adsets.length} ad set${refs.adsets.length === 1 ? "" : "s"}, ${refs.ads.length} ad${refs.ads.length === 1 ? "" : "s"} · nothing was activated`
          : `launch aborted before activation · could not record the campaign and rollback failed · campaign ${refs.campaign_id ?? "unknown"} may still exist on meta (paused) · remove it from your Meta account`,
        {
          campaign_id: refs.campaign_id,
          adsets: refs.adsets.length,
          ads: refs.ads.length,
          rolled_back: rolledBack,
          activated: false,
        },
      );
      throw new Error(campaignError?.message ?? "Could not record the campaign");
    }

    try {
      await adapter.activate(refs);
    } catch (err) {
      // Some objects may already be ACTIVE — tear down and report exactly what happened.
      let rolledBack = true;
      try {
        await adapter.teardown(refs);
      } catch {
        rolledBack = false;
      }
      await supabaseAdmin
        .from("campaigns")
        .update({ status: rolledBack ? "stopped" : "orphaned" })
        .eq("id", campaignRow.id);
      await supabaseAdmin
        .from("tests")
        .update({ status: rolledBack ? "review" : "attention" })
        .eq("id", test.id);
      await logAction(
        test.id,
        "launch_failed",
        rolledBack
          ? `launch failed on meta during activation · rolled back ${refs.adsets.length} ad set${refs.adsets.length === 1 ? "" : "s"}, ${refs.ads.length} ad${refs.ads.length === 1 ? "" : "s"} · nothing left running · ${err instanceof Error ? err.message : "unknown error"}`
          : `launch failed on meta during activation · rollback incomplete · campaign ${refs.campaign_id ?? "unknown"} may still be running on meta · stop it from the dashboard · ${err instanceof Error ? err.message : "unknown error"}`,
        {
          campaign_id: refs.campaign_id,
          adsets: refs.adsets.length,
          ads: refs.ads.length,
          rolled_back: rolledBack,
          activated: true,
        },
      );
      throw err;
    }

    await supabaseAdmin.from("campaigns").update({ status: "active" }).eq("id", campaignRow.id);
    await supabaseAdmin.from("tests").update({ status: "live" }).eq("id", test.id);

    const budget = Math.round((test.budget_cap_cents * plan.budget_split_pct) / 100);
    await logAction(
      test.id,
      "launch",
      `launched ${refs.adsets.length} ad set${refs.adsets.length === 1 ? "" : "s"}, ${refs.ads.length} ad${refs.ads.length === 1 ? "" : "s"} on meta · lifetime budget ${money(budget, test.currency)} · locked`,
      { campaign_id: refs.campaign_id, adsets: refs.adsets.length, ads: refs.ads.length },
    );

    return { ok: true, campaign_id: refs.campaign_id };
  });

export const stopTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { testId: string }) => data)
  .handler(async ({ data, context }) => {
    const { metaAdapterFor, logAction, refsFromCampaignRow } = await import("@/lib/ads.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: test, error } = await context.supabase
      .from("tests")
      .select("id, status")
      .eq("id", data.testId)
      .single();
    if (error || !test) throw new Error("Validation not found");

    // Every non-stopped row counts — including half-launched ones.
    const { data: campaigns } = await context.supabase
      .from("campaigns")
      .select("id, external_campaign_id, external_adset_ids, status")
      .eq("test_id", test.id)
      .neq("status", "stopped");

    const { adapter } = await metaAdapterFor(context.userId);

    let torn = 0;
    let failed = 0;
    for (const campaign of campaigns ?? []) {
      try {
        await adapter.teardown(refsFromCampaignRow(campaign));
        await supabaseAdmin.from("campaigns").update({ status: "stopped" }).eq("id", campaign.id);
        torn += 1;
      } catch {
        await supabaseAdmin.from("campaigns").update({ status: "orphaned" }).eq("id", campaign.id);
        failed += 1;
      }
    }

    await supabaseAdmin
      .from("tests")
      .update({ status: failed > 0 ? "attention" : "stopped" })
      .eq("id", test.id);
    await logAction(
      test.id,
      "stop",
      failed > 0
        ? `stop requested · removed ${torn} campaign${torn === 1 ? "" : "s"} on meta · ${failed} could not be removed · retry the stop`
        : torn > 0
          ? `stopped validation · removed ${torn} campaign${torn === 1 ? "" : "s"} on meta · no further spend`
          : "stopped validation · nothing was running",
      { removed: torn, failed },
    );
    if (failed > 0) throw new Error("Some campaigns could not be stopped on Meta — retry.");
    return { ok: true };
  });


export const refreshInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { testId: string }) => data)
  .handler(async ({ data, context }) => {
    const { metaAdapterFor, refsFromCampaignRow, logAction } = await import("@/lib/ads.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: test, error } = await context.supabase
      .from("tests")
      .select("id, starts_at")
      .eq("id", data.testId)
      .single();
    if (error || !test) throw new Error("Validation not found");

    const { data: campaigns } = await context.supabase
      .from("campaigns")
      .select("id, external_campaign_id, external_adset_ids")
      .eq("test_id", test.id);
    if (!campaigns || campaigns.length === 0) return { rows: 0 };

    const since = test.starts_at ? new Date(test.starts_at) : new Date(Date.now() - 30 * 864e5);
    const { adapter } = await metaAdapterFor(context.userId);

    const rows: MetricRow[] = [];
    for (const campaign of campaigns) {
      rows.push(...(await adapter.fetchInsights(refsFromCampaignRow(campaign), since)));
    }

    if (rows.length) {
      const { error: upsertError } = await supabaseAdmin.from("metric_snapshots").upsert(
        rows.map((r) => ({
          test_id: test.id,
          level: r.level,
          external_ref: r.external_ref,
          variant_id: r.variant_id,
          stat_date: r.stat_date,
          impressions: r.impressions,
          clicks: r.clicks,
          spend_cents: r.spend_cents,
          fetched_at: new Date().toISOString(),
        })),
        { onConflict: "test_id,level,external_ref,stat_date" },
      );
      if (upsertError) throw new Error(upsertError.message);
      await logAction(test.id, "refresh", `pulled ${rows.length} rows of platform data from meta`);
    }

    return { rows: rows.length };
  });
