import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Label } from "@/components/dr";
import { money } from "@/lib/dr";
import { getMetaConnection, launchTest } from "@/lib/ads.functions";
import type { PageContent } from "@/lib/dr";

export const Route = createFileRoute("/_authenticated/app/project/$id/review")({
  head: () => ({
    meta: [
      { title: "Review & launch — DemandRun" },
      {
        name: "description",
        content: "Check your angles, channel and budget cap, then approve the validation to launch real campaigns.",
      },
      { property: "og:title", content: "Review & launch — DemandRun" },
      { property: "og:description", content: "Approve your validation: angles, budget cap and guardrails in one screen." },
    ],
  }),
  component: Review,
});

type Variant = {
  id: string;
  angle_name: string;
  headline: string;
  body: string | null;
  enabled: boolean;
};

function Review() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const connectionFn = useServerFn(getMetaConnection);
  const launchFn = useServerFn(launchTest);

  const { data, isLoading } = useQuery({
    queryKey: ["review", id],
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, landing_pages(id, slug, published, content)")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: tests } = await supabase
        .from("tests")
        .select("id, status, budget_cap_cents, currency, starts_at, ends_at")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(1);
      const test = tests?.[0] ?? null;

      const { data: variants } = test
        ? await supabase
            .from("ad_variants")
            .select("id, angle_name, headline, body, enabled")
            .eq("test_id", test.id)
            .order("angle_name")
        : { data: [] as Variant[] };

      return {
        project,
        page: project.landing_pages?.[0] ?? null,
        test,
        variants: (variants ?? []) as Variant[],
      };
    },
  });

  const { data: connection } = useQuery({
    queryKey: ["meta-connection"],
    queryFn: () => connectionFn(),
  });

  const toggle = useMutation({
    mutationFn: async (variant: Variant) => {
      const { error } = await supabase
        .from("ad_variants")
        .update({ enabled: !variant.enabled })
        .eq("id", variant.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const launch = useMutation({
    mutationFn: async () => {
      if (!data?.test) throw new Error("No validation to launch");
      return launchFn({ data: { testId: data.test.id } });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Campaigns are live");
      navigate({ to: "/app/project/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  const { test, page, variants } = data;
  const content = page ? (page.content as unknown as PageContent) : null;
  const enabledCount = variants.filter((v) => v.enabled).length;
  const ready =
    Boolean(test) &&
    Boolean(page?.published) &&
    enabledCount > 0 &&
    Boolean(connection?.connected) &&
    Boolean(connection?.account_id) &&
    Boolean(connection?.page_id);

  if (!test) {
    return (
      <AppShell>
        <h1 className="text-3xl font-bold text-foreground">Nothing to review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This project has no validation set up yet.
        </p>
        <Link
          to="/app/new"
          className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-medium text-paper hover:bg-brand-deep"
        >
          New validation
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/app/project/$id"
        params={{ id }}
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        ← {data.project.name}
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Review & launch</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Everything below is pre-configured. Approve it and DemandRun creates the campaign, ad sets and
        ads in your own Meta ad account — paused first, then activated.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {/* LANDING PAGE */}
        <div className="card-paper p-6">
          <Label>Landing page</Label>
          {content && page ? (
            <>
              <h2 className="mt-4 text-xl font-medium leading-snug text-foreground">
                {content.headline}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{content.subheadline}</p>
              <div className="mt-5 flex items-center gap-3 border-t border-dashed border-hairline pt-4">
                <a
                  href={`/t/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-brand-deep underline decoration-dashed"
                >
                  /t/{page.slug}
                </a>
                <span
                  className={
                    "rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] " +
                    (page.published ? "bg-brand-tint text-brand-deep" : "bg-amber-tint text-amber")
                  }
                >
                  {page.published ? "live" : "unpublished"}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No test page yet.</p>
          )}
        </div>

        {/* CHANNEL + BUDGET */}
        <div className="card-paper p-6">
          <Label>Channel & budget</Label>
          <div className="mt-4 space-y-0">
            <Row k="Channel" v="Meta · 100%" />
            <Row k="Budget cap" v={money(test.budget_cap_cents, test.currency)} />
            <Row k="Ad account" v={connection?.account_name ?? "not connected"} />
            <Row k="Page" v={connection?.page_name ?? "not selected"} />
          </div>
          {!connection?.connected || !connection?.account_id || !connection?.page_id ? (
            <Link
              to="/app/settings"
              search={{ meta: undefined }}
              className="mt-5 inline-flex rounded-xl border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground hover:border-brand"
            >
              Finish connecting Meta
            </Link>
          ) : null}
        </div>

        {/* ANGLES */}
        <div className="card-paper p-6">
          <Label>Ad angles</Label>
          <div className="mt-4 space-y-3">
            {variants.map((v) => (
              <label
                key={v.id}
                className="row-divide flex cursor-pointer items-start gap-3 pb-3 last:border-b-0 last:pb-0"
              >
                <input
                  type="checkbox"
                  checked={v.enabled}
                  onChange={() => toggle.mutate(v)}
                  className="mt-1 h-4 w-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="label-mono">{v.angle_name}</span>
                  <span className="mt-1 block text-sm text-foreground">{v.headline}</span>
                  {v.body ? (
                    <span className="mt-1 block text-xs text-muted-foreground">{v.body}</span>
                  ) : null}
                </span>
              </label>
            ))}
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No angles generated for this validation.</p>
            ) : null}
          </div>
        </div>

        {/* GUARDRAILS */}
        <div className="card-paper p-6">
          <Label>Guardrails</Label>
          <div className="mt-4 space-y-0">
            <Row k="Hard cap" v={`${money(test.budget_cap_cents, test.currency)} lifetime`} />
            <Row k="Overspend" v="impossible — cap set on the campaign" />
            <Row k="Autopilot" v="off in this phase" />
            <Row k="Kill switch" v="Stop validation, any time" />
          </div>
        </div>
      </div>

      <div className="mt-8 mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={() => launch.mutate()}
          disabled={!ready || launch.isPending || test.status === "live"}
          className="rounded-xl bg-brand px-6 py-3.5 font-medium text-paper transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {launch.isPending
            ? "Launching…"
            : test.status === "live"
              ? "Already live"
              : `Approve & launch · ${money(test.budget_cap_cents, test.currency)}`}
        </button>
        <p className="font-mono text-xs text-muted-foreground">
          {test.status === "live"
            ? "This validation is running."
            : !page?.published
              ? "Publish your test page first."
              : enabledCount === 0
                ? "Enable at least one angle."
                : !ready
                  ? "Connect a Meta ad account and page first."
                  : `${enabledCount} angle${enabledCount === 1 ? "" : "s"} · spend stops at the cap`}
        </p>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row-divide flex items-center justify-between gap-4 py-2.5 font-mono text-xs last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right text-foreground">{v}</span>
    </div>
  );
}
