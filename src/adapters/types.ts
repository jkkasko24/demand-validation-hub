// Channel adapter contract. Every ad channel implements this interface — no
// platform SDK or platform HTTP call may live outside an adapter.

export type Audience = {
  name: string;
  geo: string[];
  age_min: number;
  age_max: number;
  interests: string[];
};

export type ChannelPlan = {
  audiences: Audience[];
  /** Share of the test's budget cap allocated to this channel, 0-100. */
  budget_split_pct: number;
};

export type Test = {
  id: string;
  project_id: string;
  budget_cap_cents: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  target_cpa_cents: number | null;
  destination_url: string;
};

export type AdVariant = {
  id: string;
  angle_name: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  enabled: boolean;
};

export type AdSetRef = { adset_id: string };

export type ExternalRefs = {
  campaign_id: string | null;
  adsets: { id: string; audience: string }[];
  ads: { id: string; adset_id: string; variant_id: string }[];
  creatives: string[];
};

export type MetricRow = {
  level: "adset" | "ad";
  external_ref: string;
  variant_id: string | null;
  stat_date: string;
  impressions: number;
  clicks: number;
  spend_cents: number;
};

export interface ChannelAdapter {
  createCampaign(test: Test, plan: ChannelPlan, variants: AdVariant[]): Promise<ExternalRefs>;
  activate(refs: ExternalRefs): Promise<void>;
  pauseAdSet(ref: AdSetRef): Promise<void>;
  /**
   * Reallocation only. capCents is the test's hard cap; implementations must
   * refuse any newBudgetCents above it.
   */
  updateBudget(ref: AdSetRef, newBudgetCents: number, capCents: number): Promise<void>;
  fetchInsights(refs: ExternalRefs, since: Date): Promise<MetricRow[]>;
  teardown(refs: ExternalRefs): Promise<void>;
}

export function emptyRefs(): ExternalRefs {
  return { campaign_id: null, adsets: [], ads: [], creatives: [] };
}
