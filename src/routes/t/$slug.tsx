import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEmail, type PageContent } from "@/lib/dr";

export const Route = createFileRoute("/t/$slug")({
  ssr: false,
  component: PublicPage,
});

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "unpublished" }
  | { kind: "ready"; id: string; content: PageContent };

function utms() {
  if (typeof window === "undefined") return { utm_source: null, utm_campaign: null, utm_content: null };
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source"),
    utm_campaign: p.get("utm_campaign"),
    utm_content: p.get("utm_content"),
  };
}

function PublicPage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("landing_pages")
        .select("id, content, published")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      if (!data) return setState({ kind: "missing" });
      if (!data.published) return setState({ kind: "unpublished" });
      setState({ kind: "ready", id: data.id, content: data.content as unknown as PageContent });

      if (!viewed.current) {
        viewed.current = true;
        await supabase.from("page_views").insert({ landing_page_id: data.id, ...utms() });
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setBusy(true);
    const { error: insertError } = await supabase
      .from("signups")
      .insert({ landing_page_id: state.id, email: email.trim(), ...utms() });
    setBusy(false);
    // 23505 = this email already signed up on this page; that's still a success.
    if (insertError && insertError.code !== "23505") {
      setError("Something went wrong. Try again.");
      return;
    }
    setDone(true);
  }

  if (state.kind === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state.kind === "unpublished" || state.kind === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="font-mono text-sm text-muted-foreground">This page isn&apos;t live.</p>
      </div>
    );
  }

  const c = state.content;

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <main className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl">{c.headline}</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">{c.subheadline}</p>

        <ul className="mt-8 space-y-3">
          {(c.bullets ?? []).slice(0, 3).map((b) => (
            <li key={b} className="flex gap-3 text-[15px] text-foreground">
              <span className="mt-0.5 text-brand">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="card-paper mt-10 p-6">
          {done ? (
            <p className="py-3 text-center text-xl font-medium text-brand">You&apos;re in. ✓</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label className="label-mono block" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-hairline bg-background px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
              />
              {error ? <p className="font-mono text-xs text-red">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand px-6 py-3 font-medium text-paper transition-colors hover:bg-brand-deep disabled:opacity-60"
              >
                {c.cta_label || "Join the early list"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-10 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
          page by demandrun<span className="text-brand">_✓</span>
        </p>
      </main>
    </div>
  );
}
