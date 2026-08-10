// Server-only helpers shared by the ad server functions.

import { decryptToken } from "@/lib/crypto.server";
import { createMetaAdapter } from "@/adapters/meta.server";
import type { ChannelAdapter, ExternalRefs } from "@/adapters/types";

export type Connection = {
  id: string;
  external_account_id: string | null;
  account_name: string | null;
  external_page_id: string | null;
  page_name: string | null;
};

export function metaConfigured(): boolean {
  return Boolean(process.env["META_APP_ID"] && process.env["META_APP_SECRET"]);
}

export function metaAppCredentials() {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) {
    throw new Error("Meta is not configured yet. Add your Meta app credentials first.");
  }
  return { appId, appSecret };
}

export async function loadConnection(userId: string): Promise<Connection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ad_accounts")
    .select("id, external_account_id, account_name, external_page_id, page_name")
    .eq("user_id", userId)
    .eq("platform", "meta")
    .maybeSingle();
  return data ?? null;
}

export async function loadAccessToken(adAccountRowId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ad_account_tokens")
    .select("oauth_token_encrypted")
    .eq("ad_account_id", adAccountRowId)
    .maybeSingle();
  if (error || !data) throw new Error("Meta connection is missing its access token — reconnect.");
  return decryptToken(data.oauth_token_encrypted);
}

export async function metaAdapterFor(userId: string): Promise<{
  adapter: ChannelAdapter;
  connection: Connection;
}> {
  const connection = await loadConnection(userId);
  if (!connection) throw new Error("Connect a Meta ad account first.");
  if (!connection.external_account_id) throw new Error("Pick which Meta ad account to use first.");
  const accessToken = await loadAccessToken(connection.id);
  return {
    connection,
    adapter: createMetaAdapter({
      accessToken,
      adAccountId: connection.external_account_id,
      pageId: connection.external_page_id,
    }),
  };
}

export async function logAction(
  testId: string,
  actionType: string,
  humanLog: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("autopilot_actions").insert({
    test_id: testId,
    action_type: actionType,
    human_log: humanLog,
    params: params as never,
  });
}

export function refsFromCampaignRow(row: {
  external_campaign_id: string | null;
  external_adset_ids: unknown;
}): ExternalRefs {
  const stored = (row.external_adset_ids ?? {}) as Partial<ExternalRefs>;
  return {
    campaign_id: row.external_campaign_id,
    adsets: stored.adsets ?? [],
    ads: stored.ads ?? [],
    creatives: stored.creatives ?? [],
  };
}

export function money(cents: number, currency = "usd"): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : `${currency.toUpperCase()} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
