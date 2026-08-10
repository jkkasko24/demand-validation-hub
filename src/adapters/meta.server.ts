// Meta (Facebook) Marketing API implementation of ChannelAdapter.
// Server-only: access tokens must never reach the browser.

import {
  emptyRefs,
  type AdSetRef,
  type AdVariant,
  type ChannelAdapter,
  type ChannelPlan,
  type ExternalRefs,
  type MetricRow,
  type Test,
} from "@/adapters/types";

const GRAPH = "https://graph.facebook.com/v21.0";

export type MetaCredentials = {
  accessToken: string;
  /** Ad account id, with or without the act_ prefix. */
  adAccountId: string;
  pageId: string | null;
};

type GraphError = { error?: { message?: string; error_user_msg?: string } };

async function graph<T>(
  path: string,
  token: string,
  init?: { method?: string; body?: Record<string, unknown> },
): Promise<T> {
  const method = init?.method ?? "GET";
  const url = new URL(`${GRAPH}${path}`);
  let body: URLSearchParams | undefined;

  if (method === "GET") {
    for (const [k, v] of Object.entries(init?.body ?? {})) {
      url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  } else {
    body = new URLSearchParams();
    for (const [k, v] of Object.entries(init?.body ?? {})) {
      body.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(body ? { body } : {}),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as T & GraphError) : ({} as T & GraphError);

  if (!res.ok || json.error) {
    const message =
      json.error?.error_user_msg || json.error?.message || `Meta API error (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

function actId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

function isoOrDefault(value: string | null, fallbackDays: number): string {
  if (value) return new Date(value).toISOString();
  const d = new Date();
  d.setDate(d.getDate() + fallbackDays);
  return d.toISOString();
}

export function createMetaAdapter(creds: MetaCredentials): ChannelAdapter {
  const token = creds.accessToken;
  const account = actId(creds.adAccountId);

  return {
    async createCampaign(test: Test, plan: ChannelPlan, variants: AdVariant[]) {
      const refs = emptyRefs();
      const budgetCents = Math.round((test.budget_cap_cents * plan.budget_split_pct) / 100);
      const enabled = variants.filter((v) => v.enabled);
      if (enabled.length === 0) throw new Error("Enable at least one ad angle before launching");
      if (!creds.pageId) throw new Error("Connect a Facebook page before launching");

      try {
        const campaign = await graph<{ id: string }>(`/${account}/campaigns`, token, {
          method: "POST",
          body: {
            name: `DemandRun validation ${test.id.slice(0, 8)}`,
            objective: "OUTCOME_TRAFFIC",
            status: "PAUSED",
            buying_type: "AUCTION",
            special_ad_categories: [],
            lifetime_budget: String(budgetCents),
          },
        });
        refs.campaign_id = campaign.id;

        const start = isoOrDefault(test.starts_at, 0);
        const end = isoOrDefault(test.ends_at, 7);

        for (const audience of plan.audiences) {
          const adset = await graph<{ id: string }>(`/${account}/adsets`, token, {
            method: "POST",
            body: {
              name: audience.name,
              campaign_id: campaign.id,
              billing_event: "IMPRESSIONS",
              optimization_goal: "LINK_CLICKS",
              destination_type: "WEBSITE",
              start_time: start,
              end_time: end,
              status: "PAUSED",
              targeting: {
                geo_locations: { countries: audience.geo.length ? audience.geo : ["US"] },
                age_min: audience.age_min,
                age_max: audience.age_max,
                ...(audience.interests.length
                  ? { flexible_spec: [{ interests: audience.interests.map((i) => ({ name: i })) }] }
                  : {}),
              },
            },
          });
          refs.adsets.push({ id: adset.id, audience: audience.name });

          for (const variant of enabled) {
            const destination = `${test.destination_url}${test.destination_url.includes("?") ? "&" : "?"}utm_source=meta&utm_campaign=${test.id}&utm_content=${variant.id}`;

            const creative = await graph<{ id: string }>(`/${account}/adcreatives`, token, {
              method: "POST",
              body: {
                name: `${variant.angle_name} creative`,
                object_story_spec: {
                  page_id: creds.pageId,
                  link_data: {
                    link: destination,
                    message: variant.body ?? variant.headline,
                    name: variant.headline,
                    ...(variant.image_url ? { picture: variant.image_url } : {}),
                    call_to_action: { type: "LEARN_MORE", value: { link: destination } },
                  },
                },
              },
            });
            refs.creatives.push(creative.id);

            const ad = await graph<{ id: string }>(`/${account}/ads`, token, {
              method: "POST",
              body: {
                name: `${audience.name} · ${variant.angle_name}`,
                adset_id: adset.id,
                creative: { creative_id: creative.id },
                status: "PAUSED",
              },
            });
            refs.ads.push({ id: ad.id, adset_id: adset.id, variant_id: variant.id });
          }
        }

        return refs;
      } catch (error) {
        // Nothing half-built is left behind on the platform.
        await this.teardown(refs).catch(() => undefined);
        throw error;
      }
    },

    async activate(refs) {
      for (const adset of refs.adsets) {
        await graph(`/${adset.id}`, token, { method: "POST", body: { status: "ACTIVE" } });
      }
      for (const ad of refs.ads) {
        await graph(`/${ad.id}`, token, { method: "POST", body: { status: "ACTIVE" } });
      }
      if (refs.campaign_id) {
        await graph(`/${refs.campaign_id}`, token, { method: "POST", body: { status: "ACTIVE" } });
      }
    },

    async pauseAdSet(ref: AdSetRef) {
      await graph(`/${ref.adset_id}`, token, { method: "POST", body: { status: "PAUSED" } });
    },

    async updateBudget(ref: AdSetRef, newBudgetCents: number) {
      await graph(`/${ref.adset_id}`, token, {
        method: "POST",
        body: { lifetime_budget: String(Math.max(100, Math.round(newBudgetCents))) },
      });
    },

    async fetchInsights(refs, since) {
      if (!refs.campaign_id) return [];
      const variantByAd = new Map(refs.ads.map((a) => [a.id, a.variant_id]));
      const rows: MetricRow[] = [];
      const until = new Date();

      for (const level of ["adset", "ad"] as const) {
        const data = await graph<{
          data: {
            date_start: string;
            impressions?: string;
            clicks?: string;
            spend?: string;
            adset_id?: string;
            ad_id?: string;
          }[];
        }>(`/${refs.campaign_id}/insights`, token, {
          body: {
            level,
            time_increment: "1",
            fields: "impressions,clicks,spend,adset_id,ad_id",
            time_range: {
              since: since.toISOString().slice(0, 10),
              until: until.toISOString().slice(0, 10),
            },
          },
        });

        for (const row of data.data ?? []) {
          const ref = level === "ad" ? row.ad_id : row.adset_id;
          if (!ref) continue;
          rows.push({
            level,
            external_ref: ref,
            variant_id: level === "ad" ? variantByAd.get(ref) ?? null : null,
            stat_date: row.date_start,
            impressions: Number(row.impressions ?? 0),
            clicks: Number(row.clicks ?? 0),
            spend_cents: Math.round(Number(row.spend ?? 0) * 100),
          });
        }
      }
      return rows;
    },

    async teardown(refs: ExternalRefs) {
      const del = async (id: string) => {
        try {
          await graph(`/${id}`, token, { method: "DELETE" });
        } catch {
          // best effort: a parent delete may already have removed the child
        }
      };
      for (const ad of refs.ads) await del(ad.id);
      for (const creative of refs.creatives) await del(creative);
      for (const adset of refs.adsets) await del(adset.id);
      if (refs.campaign_id) await del(refs.campaign_id);
    },
  };
}

export async function listMetaAssets(token: string) {
  const [accounts, pages] = await Promise.all([
    graph<{ data: { id: string; name?: string; account_id?: string }[] }>(
      "/me/adaccounts",
      token,
      { body: { fields: "id,name,account_id" } },
    ),
    graph<{ data: { id: string; name?: string }[] }>("/me/accounts", token, {
      body: { fields: "id,name" },
    }),
  ]);
  return {
    accounts: (accounts.data ?? []).map((a) => ({ id: a.id, name: a.name ?? a.id })),
    pages: (pages.data ?? []).map((p) => ({ id: p.id, name: p.name ?? p.id })),
  };
}

export async function exchangeMetaCode(params: {
  code: string;
  redirectUri: string;
  appId: string;
  appSecret: string;
}): Promise<{ accessToken: string; expiresAt: string | null }> {
  const short = await graph<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    "",
    {
      body: {
        client_id: params.appId,
        client_secret: params.appSecret,
        redirect_uri: params.redirectUri,
        code: params.code,
      },
    },
  );

  const long = await graph<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    "",
    {
      body: {
        grant_type: "fb_exchange_token",
        client_id: params.appId,
        client_secret: params.appSecret,
        fb_exchange_token: short.access_token,
      },
    },
  );

  const expiresIn = long.expires_in ?? short.expires_in ?? null;
  return {
    accessToken: long.access_token,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}
