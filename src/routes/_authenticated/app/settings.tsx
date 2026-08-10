import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Label } from "@/components/dr";
import {
  disconnectMeta,
  getMetaAuthUrl,
  getMetaConnection,
  listMetaAssets,
  selectMetaAccount,
} from "@/lib/ads.functions";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Ad channels — DemandRun" },
      {
        name: "description",
        content: "Connect your Meta ad account so DemandRun can launch validation campaigns with a hard budget cap.",
      },
      { property: "og:title", content: "Ad channels — DemandRun" },
      { property: "og:description", content: "Connect Meta and pick the ad account DemandRun should spend from." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    meta: typeof search['meta'] === "string" ? search['meta'] : undefined,
  }),
  component: Settings,
});

function Settings() {
  const search = useSearch({ from: "/_authenticated/app/settings" });
  const qc = useQueryClient();
  const connectionFn = useServerFn(getMetaConnection);
  const assetsFn = useServerFn(listMetaAssets);
  const authUrlFn = useServerFn(getMetaAuthUrl);
  const selectFn = useServerFn(selectMetaAccount);
  const disconnectFn = useServerFn(disconnectMeta);

  const { data: connection, isLoading } = useQuery({
    queryKey: ["meta-connection"],
    queryFn: () => connectionFn(),
  });

  const { data: assets } = useQuery({
    queryKey: ["meta-assets"],
    queryFn: () => assetsFn(),
    enabled: Boolean(connection?.connected),
  });

  const [accountId, setAccountId] = useState("");
  const [pageId, setPageId] = useState("");

  useEffect(() => {
    if (connection?.account_id) setAccountId(connection.account_id);
    if (connection?.page_id) setPageId(connection.page_id);
  }, [connection?.account_id, connection?.page_id]);

  useEffect(() => {
    if (search.meta === "connected") toast.success("Meta connected — pick your ad account below");
    if (search.meta === "denied") toast.error("Meta connection was cancelled");
    if (search.meta === "error") toast.error("Meta connection failed. Try again.");
  }, [search.meta]);

  const connect = useMutation({
    mutationFn: () => authUrlFn(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const account = assets?.accounts.find((a) => a.id === accountId);
      const page = assets?.pages.find((p) => p.id === pageId) ?? null;
      if (!account) throw new Error("Pick an ad account");
      return selectFn({
        data: {
          account_id: account.id,
          account_name: account.name,
          page_id: page?.id ?? null,
          page_name: page?.name ?? null,
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meta-connection"] });
      toast.success("Ad account saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meta-connection"] });
      await qc.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Meta disconnected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const select =
    "mt-2 w-full rounded-xl border border-hairline bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none focus:border-brand";

  return (
    <AppShell>
      <Link
        to="/app"
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        ← All validations
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Ad channels</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        DemandRun launches campaigns from your own ad account, with a lifetime budget locked to the
        cap you set. Your access token stays on the server.
      </p>

      <section className="mt-10">
        <Label>Meta</Label>
        <div className="card-paper mt-4 p-6">
          {isLoading ? (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Loading…</p>
          ) : !connection?.configured ? (
            <div>
              <p className="text-lg text-foreground">Meta not configured</p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Your Meta app credentials aren't set yet, so connecting is disabled. Add them and this
                card turns on.
              </p>
            </div>
          ) : !connection.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg text-foreground">Not connected</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  ads_management · ads_read
                </p>
              </div>
              <button
                onClick={() => connect.mutate()}
                disabled={connect.isPending}
                className="rounded-xl bg-brand px-5 py-3 font-medium text-paper transition-colors hover:bg-brand-deep disabled:opacity-60"
              >
                {connect.isPending ? "Opening Meta…" : "Connect Meta"}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg text-foreground">
                    Connected{connection.account_name ? ` · ${connection.account_name}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {connection.account_id ?? "no ad account selected yet"}
                    {connection.page_name ? ` · page: ${connection.page_name}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="rounded-lg border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-red hover:text-red disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>

              <div className="mt-6 grid gap-4 border-t border-dashed border-hairline pt-6 sm:grid-cols-2">
                <div>
                  <Label>Ad account</Label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className={select}
                  >
                    <option value="">Choose an ad account…</option>
                    {assets?.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Facebook page (ads run from this)</Label>
                  <select value={pageId} onChange={(e) => setPageId(e.target.value)} className={select}>
                    <option value="">Choose a page…</option>
                    {assets?.pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !accountId}
                className="mt-5 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save selection"}
              </button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
