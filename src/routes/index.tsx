import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, Label, VerdictStamp } from "@/components/dr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DemandRun — You built the app. Now validate the demand." },
      {
        name: "description",
        content:
          "DemandRun gives indie builders a hosted test landing page with signup tracking built in, so you find out whether anyone wants the app you shipped.",
      },
      { property: "og:title", content: "DemandRun — You built the app. Now validate the demand." },
      {
        property: "og:description",
        content:
          "Describe your app, get a live test page with signup tracking in two minutes. Validate demand before you build more.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  ["01", "Describe it", "Answer three questions about your app, who it's for, and the pain it kills."],
  [
    "02",
    "Ship a test page",
    "We assemble a clean landing page at your own public URL, tracking every view and signup.",
  ],
  [
    "03",
    "Run ads, get the verdict",
    "Connect your ad account, set a hard budget cap, and campaigns run against the page until the numbers call it.",
  ],
] as const;

const verdicts = [
  {
    verdict: "CONTINUE",
    when: "Signups convert above your bar at a cost you can live with.",
    next: "Build the next thing. Demand is real.",
  },
  {
    verdict: "PIVOT",
    when: "People click but don't sign up, or one angle wildly outperforms the rest.",
    next: "Rewrite the promise or change the audience, then rerun.",
  },
  {
    verdict: "STOP",
    when: "The cap burns through with barely a signup on any angle.",
    next: "Stop paying for it. Move on with the evidence.",
  },
] as const;

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-5">
            <Link
              to="/auth"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="rounded-xl bg-brand px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-paper transition-colors hover:bg-brand-deep"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Split hero */}
        <section className="grid items-center gap-14 border-b border-dashed border-hairline py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <Label>Demand validation for indie builders</Label>
            <h1 className="mt-6 text-[3.25rem] leading-[0.9] text-foreground sm:text-7xl lg:text-[5.5rem]">
              You built the app.
              <br />
              <span className="text-brand">Now validate</span>
              <br />
              the demand.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
              Shipping is the easy part now. DemandRun turns a one-line description of your app into
              a hosted test page with signup tracking wired in, then puts real ad spend behind it —
              so you learn whether anyone wants it before you build another feature.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center rounded-xl bg-brand px-6 py-3.5 font-medium text-paper transition-colors hover:bg-brand-deep"
              >
                Start a validation
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Live page in ~2 minutes
              </span>
            </div>
          </div>

          {/* Mock validation card */}
          <div className="relative">
            <div className="card-paper p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label>Validation</Label>
                  <h2 className="mt-2 text-3xl text-foreground">Habitloop</h2>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    /t/habitloop-ios
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-brand-tint px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-brand-deep">
                  live
                </span>
              </div>

              <dl className="mt-6 font-mono text-sm">
                {[
                  ["Views", "1,842"],
                  ["Signups", "137"],
                  ["Conversion", "7.4%"],
                  ["Spend / cap", "$118 / $150"],
                  ["Cost per signup", "$0.86"],
                ].map(([k, v]) => (
                  <div key={k} className="row-divide flex items-baseline justify-between py-3">
                    <dt className="label-mono">{k}</dt>
                    <dd className="text-base text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex items-center gap-4">
                <VerdictStamp verdict="CONTINUE" />
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Demand confirmed
                  <br />
                  at $0.86 per signup
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-dashed border-hairline py-16">
          <Label>How it works</Label>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map(([n, title, body]) => (
              <div key={n} className="row-divide pb-6 md:border-b-0">
                <div className="font-mono text-[11px] font-medium tracking-[0.14em] text-brand">
                  {n}
                </div>
                <h2 className="mt-3 text-2xl text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Results / verdicts */}
        <section className="border-b border-dashed border-hairline py-16">
          <Label>The verdict</Label>
          <h2 className="mt-5 max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl">
            Every run ends in a decision, not a dashboard.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {verdicts.map((v) => (
              <div key={v.verdict} className="card-paper flex flex-col gap-5 p-6">
                <VerdictStamp verdict={v.verdict} className="self-start" />
                <div>
                  <div className="label-mono">When</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{v.when}</p>
                </div>
                <div className="mt-auto border-t border-dashed border-hairline pt-4">
                  <div className="label-mono">What you do</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.next}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-16">
          <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-brand-tint px-8 py-12 sm:px-12">
            <div>
              <h2 className="max-w-xl text-4xl leading-[0.95] text-brand-deep sm:text-5xl">
                Find out if anyone wants it.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-brand-deep/80">
                One description in. A live test page, tracked signups, and a verdict out.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center rounded-xl bg-brand px-6 py-3.5 font-medium text-paper transition-colors hover:bg-brand-deep"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Logo />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Validate before you build
          </span>
        </div>
      </footer>
    </div>
  );
}
