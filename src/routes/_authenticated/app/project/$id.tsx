import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Label, StatTile, VerdictStamp } from "@/components/dr";
import { pct, type PageContent } from "@/lib/dr";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/project/$id")({
  head: () => ({
    meta: [
      { title: "Validation detail — DemandRun" },
      { name: "description", content: "Your test page, its results, and the campaign decision engine coming soon." },
      { property: "og:title", content: "Validation detail — DemandRun" },
      { property: "og:description", content: "Edit your test page content and watch views and signups land." },
    ],
  }),
  component: ProjectDetail,
});

type Detail = {
  project: { id: string; name: string; app_url: string | null };
  page: { id: string; slug: string; published: boolean; content: PageContent } | null;
  views: { utm_source: string | null }[];
  signups: { email: string; utm_source: string | null; created_at: string | null }[];
};

function ProjectDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async (): Promise<Detail> => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, app_url")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: pages } = await supabase
        .from("landing_pages")
        .select("id, slug, published, content")
        .eq("project_id", id)
        .order("created_at", { ascending: true });
      const page = pages?.[0] ?? null;

      if (!page) return { project, page: null, views: [], signups: [] };

      const [views, signups] = await Promise.all([
        supabase.from("page_views").select("utm_source").eq("landing_page_id", page.id),
        supabase
          .from("signups")
          .select("email, utm_source, created_at")
          .eq("landing_page_id", page.id)
          .order("created_at", { ascending: false }),
      ]);

      return {
        project,
        page: { ...page, published: page.published ?? false, content: page.content as unknown as PageContent },
        views: views.data ?? [],
        signups: signups.data ?? [],
      };
    },
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  const page = data.page;
  const publicUrl = page ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${page.slug}` : "";
  const views = data.views.length;
  const signups = data.signups.length;

  const bySource = data.signups.reduce<Record<string, number>>((acc, s) => {
    const key = s.utm_source || "direct";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  async function togglePublish() {
    if (!page) return;
    const { error } = await supabase
      .from("landing_pages")
      .update({ published: !page.published })
      .eq("id", page.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["project", id] });
    toast.success(page.published ? "Page unpublished" : "Page is live");
  }

  return (
    <AppShell>
      <Link
        to="/app"
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        ← All validations
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">{data.project.name}</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{data.project.app_url ?? "—"}</p>

      {/* TEST PAGE */}
      <section className="mt-12">
        <Label>Test page</Label>
        {page ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="card-paper overflow-hidden p-0">
              <div className="border-b border-dashed border-hairline px-6 py-3">
                <span className="label-mono">Preview</span>
              </div>
              <div className="px-6 py-8">
                <h2 className="text-2xl font-bold leading-tight text-foreground">{page.content.headline}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{page.content.subheadline}</p>
                <ul className="mt-5 space-y-2">
                  {page.content.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-foreground">
                      <span className="text-brand">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-paper">
                  {page.content.cta_label}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-hairline px-6 py-4">
                <a
                  href={`/t/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-brand-deep underline decoration-dashed"
                >
                  /t/{page.slug}
                </a>
                <CopyButton value={publicUrl} label="Copy URL" />
                <button
                  onClick={togglePublish}
                  className="ml-auto rounded-xl bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-brand-deep"
                >
                  {page.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>

            <EditPanel page={page} onSaved={() => qc.invalidateQueries({ queryKey: ["project", id] })} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No test page for this project yet.</p>
        )}
      </section>

      {/* RESULTS */}
      <section className="mt-14">
        <Label>Results</Label>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <StatTile label="Views" value={String(views)} />
          <StatTile label="Signups" value={String(signups)} />
          <StatTile label="Conversion rate" value={pct(views, signups)} hint={`${signups}/${views}`} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="card-paper p-0">
            <div className="border-b border-dashed border-hairline px-6 py-3">
              <span className="label-mono">Signups</span>
            </div>
            {data.signups.length === 0 ? (
              <p className="px-6 py-8 font-mono text-xs text-muted-foreground">No signups yet.</p>
            ) : (
              <div>
                {data.signups.map((s) => (
                  <div
                    key={`${s.email}-${s.created_at}`}
                    className="row-divide flex items-center gap-4 px-6 py-3 font-mono text-xs last:border-b-0"
                  >
                    <span className="flex-1 truncate text-foreground">{s.email}</span>
                    <span className="w-24 truncate text-muted-foreground">{s.utm_source || "direct"}</span>
                    <span className="w-24 text-right text-muted-foreground">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-paper p-0">
            <div className="border-b border-dashed border-hairline px-6 py-3">
              <span className="label-mono">By source</span>
            </div>
            {Object.keys(bySource).length === 0 ? (
              <p className="px-6 py-8 font-mono text-xs text-muted-foreground">No data yet.</p>
            ) : (
              Object.entries(bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, n]) => (
                  <div
                    key={source}
                    className="row-divide flex items-center justify-between px-6 py-3 font-mono text-xs last:border-b-0"
                  >
                    <span className="text-muted-foreground">{source}</span>
                    <span className="text-foreground">{n}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        {page ? <ShareHelper baseUrl={publicUrl} /> : null}
      </section>

      {/* CAMPAIGNS */}
      <section className="mt-14 mb-6">
        <Label>Campaigns — coming soon</Label>
        <div className="card-paper mt-4 select-none border-dashed p-8 opacity-60">
          <p className="max-w-xl text-lg text-foreground">
            Ad campaigns, autopilot, and your CONTINUE / PIVOT / STOP decision launch here soon.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <VerdictStamp verdict="CONTINUE" />
            <VerdictStamp verdict="PIVOT" />
            <VerdictStamp verdict="STOP" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function ShareHelper({ baseUrl }: { baseUrl: string }) {
  const [source, setSource] = useState("x");
  const [content, setContent] = useState("angle-a");
  const link = `${baseUrl}?utm_source=${encodeURIComponent(source)}&utm_content=${encodeURIComponent(content)}`;

  return (
    <div className="card-paper mt-6 p-6">
      <Label>Share tracked link</Label>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSource("x")}
          className="rounded-full border border-hairline px-4 py-2 font-mono text-xs text-foreground transition-colors hover:border-brand hover:bg-brand-tint"
        >
          X / Twitter link
        </button>
        <button
          onClick={() => setSource("reddit")}
          className="rounded-full border border-hairline px-4 py-2 font-mono text-xs text-foreground transition-colors hover:border-brand hover:bg-brand-tint"
        >
          Reddit link
        </button>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded-xl border border-hairline bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-brand"
          placeholder="utm_content"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-hairline pt-4">
        <code className="flex-1 break-all font-mono text-xs text-brand-deep">{link}</code>
        <CopyButton value={link} label="Copy link" />
      </div>
    </div>
  );
}

function EditPanel({
  page,
  onSaved,
}: {
  page: { id: string; content: PageContent };
  onSaved: () => void;
}) {
  const [content, setContent] = useState<PageContent>(page.content);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(page.content);
  }, [page.content]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({ content: content as unknown as never })
      .eq("id", page.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
    toast.success("Content saved");
  }

  const field =
    "mt-2 w-full rounded-xl border border-hairline bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none focus:border-brand";

  return (
    <div className="card-paper p-6">
      <Label>Edit content</Label>
      <div className="mt-4 space-y-4">
        <div>
          <Label>Headline</Label>
          <input
            value={content.headline}
            onChange={(e) => setContent({ ...content, headline: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <Label>Subheadline</Label>
          <textarea
            rows={2}
            value={content.subheadline}
            onChange={(e) => setContent({ ...content, subheadline: e.target.value })}
            className={field}
          />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Label>Bullet {i + 1}</Label>
            <input
              value={content.bullets[i] ?? ""}
              onChange={(e) => {
                const bullets = [...content.bullets];
                bullets[i] = e.target.value;
                setContent({ ...content, bullets });
              }}
              className={field}
            />
          </div>
        ))}
        <div>
          <Label>CTA label</Label>
          <input
            value={content.cta_label}
            onChange={(e) => setContent({ ...content, cta_label: e.target.value })}
            className={field}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save content"}
        </button>
      </div>
    </div>
  );
}
