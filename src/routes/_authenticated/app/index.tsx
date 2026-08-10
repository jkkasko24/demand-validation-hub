import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Label } from "@/components/dr";
import { pct, type PageContent } from "@/lib/dr";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Your validations — DemandRun" },
      { name: "description", content: "All your DemandRun test pages, views, signups and conversion rates in one place." },
      { property: "og:title", content: "Your validations — DemandRun" },
      { property: "og:description", content: "Track views, signups and conversion for every app you're validating." },
    ],
  }),
  component: Dashboard,
});

type Row = {
  id: string;
  name: string;
  app_url: string | null;
  slug: string | null;
  published: boolean;
  views: number;
  signups: number;
};

function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Row[]> => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, name, app_url, created_at, landing_pages(id, slug, published, content)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const pageIds = (projects ?? []).flatMap((p) => p.landing_pages.map((lp) => lp.id));
      const [views, signups] = await Promise.all([
        pageIds.length
          ? supabase.from("page_views").select("landing_page_id").in("landing_page_id", pageIds)
          : Promise.resolve({ data: [], error: null }),
        pageIds.length
          ? supabase.from("signups").select("landing_page_id").in("landing_page_id", pageIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const count = (rows: { landing_page_id: string }[] | null, id: string) =>
        (rows ?? []).filter((r) => r.landing_page_id === id).length;

      return (projects ?? []).map((p) => {
        const lp = p.landing_pages[0];
        return {
          id: p.id,
          name: p.name,
          app_url: p.app_url,
          slug: lp?.slug ?? null,
          published: lp?.published ?? false,
          views: lp ? count(views.data as { landing_page_id: string }[], lp.id) : 0,
          signups: lp ? count(signups.data as { landing_page_id: string }[], lp.id) : 0,
        };
      });
    },
  });
}

function Dashboard() {
  const { data, isLoading } = useProjects();

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Validations</Label>
          <h1 className="mt-3 text-3xl font-bold text-foreground">Your test pages</h1>
        </div>
        <Link
          to="/app/new"
          className="rounded-xl bg-brand px-5 py-3 font-medium text-paper transition-colors hover:bg-brand-deep"
        >
          New validation
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-12 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Loading…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card-paper mt-10 p-10 text-center">
          <p className="mx-auto max-w-md text-lg text-foreground">
            No validations yet. Describe your app and get a live test page in two minutes.
          </p>
          <Link
            to="/app/new"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-medium text-paper transition-colors hover:bg-brand-deep"
          >
            New validation
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {data?.map((p) => (
            <Link
              key={p.id}
              to="/app/project/$id"
              params={{ id: p.id }}
              className="card-paper block p-6 transition-colors hover:border-brand"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-medium text-foreground">{p.name}</h2>
                <span
                  className={
                    "shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] " +
                    (p.published ? "bg-brand-tint text-brand-deep" : "bg-muted text-muted-foreground")
                  }
                >
                  {p.published ? "live" : "draft"}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{p.app_url ?? "—"}</p>

              <div className="mt-5 flex items-stretch border-t border-dashed border-hairline pt-4 font-mono text-xs">
                <div className="flex-1">
                  <div className="label-mono">Views</div>
                  <div className="mt-1 text-base text-foreground">{p.views}</div>
                </div>
                <div className="flex-1">
                  <div className="label-mono">Signups</div>
                  <div className="mt-1 text-base text-foreground">{p.signups}</div>
                </div>
                <div className="flex-1">
                  <div className="label-mono">Conv.</div>
                  <div className="mt-1 text-base text-foreground">{pct(p.views, p.signups)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export type { PageContent };
