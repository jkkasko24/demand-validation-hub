import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Label } from "@/components/dr";
import { nameFromAnswer, slugify, type PageContent } from "@/lib/dr";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/new")({
  head: () => ({
    meta: [
      { title: "New validation — DemandRun" },
      { name: "description", content: "Answer three questions and DemandRun builds your test landing page with signup tracking." },
      { property: "og:title", content: "New validation — DemandRun" },
      { property: "og:description", content: "Describe your app and get a live test page in two minutes." },
    ],
  }),
  component: NewValidation,
});

const AUDIENCES = [
  "Busy professionals",
  "Students",
  "Indie builders",
  "Parents",
  "Honestly not sure",
];

const BUILD_STEPS = ["Wrote your positioning", "Generated your test page", "Wired up signup tracking"];

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-hairline bg-card px-5 py-3.5 text-foreground">
      {children}
    </div>
  );
}

function Answer({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-tint px-5 py-3.5 font-mono text-sm text-brand-deep">
      {children}
    </div>
  );
}

function NewValidation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [appAnswer, setAppAnswer] = useState("");
  const [audience, setAudience] = useState("");
  const [pain, setPain] = useState("");
  const [draft, setDraft] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);
  const [ticks, setTicks] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const created = useRef(false);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, ticks, otherOpen]);

  useEffect(() => {
    if (step !== 3) return;
    const timers = BUILD_STEPS.map((_, i) => window.setTimeout(() => setTicks(i + 1), 700 + i * 800));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  useEffect(() => {
    if (step !== 3 || ticks < BUILD_STEPS.length || created.current) return;
    created.current = true;
    void create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ticks]);

  async function uniqueSlug(base: string) {
    let slug = base;
    for (let i = 1; i < 50; i++) {
      const { data } = await supabase.from("landing_pages").select("id").eq("slug", slug).maybeSingle();
      if (!data) return slug;
      slug = `${base}-${i + 1}`;
    }
    return `${base}-${Date.now()}`;
  }

  async function create() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const name = nameFromAnswer(appAnswer);
      const looksLikeUrl = /^(https?:\/\/|[\w-]+\.[a-z]{2,})/i.test(appAnswer.trim());
      const pitch = looksLikeUrl ? name : appAnswer.trim();

      const positioning = { audience, pain, pitch, tone: "direct" };

      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name,
          app_url: looksLikeUrl
            ? appAnswer.trim().startsWith("http")
              ? appAnswer.trim()
              : `https://${appAnswer.trim()}`
            : null,
          category: audience,
          positioning,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      const content: PageContent = {
        headline: pitch,
        subheadline: `For ${audience.toLowerCase()} who are tired of ${pain.replace(/\.$/, "").toLowerCase()}.`,
        bullets: [
          `Built for ${audience.toLowerCase()}`,
          `Kills the ${pain.replace(/\.$/, "").toLowerCase()} problem`,
          "Early access, no setup required",
        ],
        cta_label: "Join the early list",
        audience,
      };

      // uniqueSlug can't see other users' unpublished slugs (RLS), so the
      // insert may still hit the unique constraint — retry with a suffix.
      const baseSlug = await uniqueSlug(slugify(name));
      let slug = baseSlug;
      for (let attempt = 0; ; attempt++) {
        const { error: lErr } = await supabase
          .from("landing_pages")
          .insert({ project_id: project.id, slug, content, published: true });
        if (!lErr) break;
        if (lErr.code !== "23505" || attempt >= 4) throw lErr;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
      }

      navigate({ to: "/app/project/$id", params: { id: project.id } });
    } catch (err) {
      created.current = false;
      toast.error(err instanceof Error ? err.message : "Could not create your validation");
      setStep(2);
    }
  }

  return (
    <AppShell>
      <Label>Setup</Label>
      <h1 className="mt-3 text-3xl font-bold text-foreground">Let's build your test page</h1>

      <div className="mt-10 flex flex-col gap-4">
        <Bubble>What's your app? Drop the URL or a one-line description.</Bubble>
        {step > 0 ? <Answer>{appAnswer}</Answer> : null}

        {step === 0 ? (
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length < 3) return;
              setAppAnswer(draft.trim());
              setDraft("");
              setStep(1);
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="myapp.com or “an AI meal planner for shift workers”"
              className="flex-1 rounded-xl border border-hairline bg-card px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
            />
            <button className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
              Send
            </button>
          </form>
        ) : null}

        {step >= 1 ? <Bubble>Who do you picture using it?</Bubble> : null}
        {step > 1 ? <Answer>{audience}</Answer> : null}

        {step === 1 ? (
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAudience(a);
                  setStep(2);
                }}
                className="rounded-full border border-hairline bg-card px-4 py-2 font-mono text-xs text-foreground transition-colors hover:border-brand hover:bg-brand-tint"
              >
                {a}
              </button>
            ))}
            {otherOpen ? (
              <form
                className="flex w-full gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setAudience(draft.trim());
                  setDraft("");
                  setStep(2);
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Who exactly?"
                  className="flex-1 rounded-xl border border-hairline bg-card px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
                />
                <button className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
                  Send
                </button>
              </form>
            ) : (
              <button
                onClick={() => setOtherOpen(true)}
                className="rounded-full border border-dashed border-hairline px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
              >
                Other…
              </button>
            )}
          </div>
        ) : null}

        {step >= 2 ? <Bubble>What's the main pain it solves?</Bubble> : null}
        {step > 2 ? <Answer>{pain}</Answer> : null}

        {step === 2 ? (
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length < 3) return;
              setPain(draft.trim());
              setDraft("");
              setStep(3);
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. wasting an hour every week on planning"
              className="flex-1 rounded-xl border border-hairline bg-card px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
            />
            <button className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
              Send
            </button>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="card-paper p-6">
            <Label>Building your test page</Label>
            <ul className="mt-4 space-y-3">
              {BUILD_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 font-mono text-sm">
                  <span
                    className={
                      "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px] " +
                      (ticks > i
                        ? "border-brand bg-brand-tint text-brand"
                        : "border-hairline text-muted-foreground")
                    }
                  >
                    {ticks > i ? "✓" : ""}
                  </span>
                  <span className={ticks > i ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div ref={bottom} />
      </div>
    </AppShell>
  );
}

