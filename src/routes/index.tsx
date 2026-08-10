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

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Link
          to="/auth"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-dashed border-hairline py-20 md:py-28">
          <Label>Demand validation for indie builders</Label>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] text-foreground md:text-6xl">
            You built the app.
            <br />
            Now validate the demand.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Shipping is the easy part now. DemandRun turns a one-line description of your app into a
            hosted test landing page with signup tracking wired in — so you learn whether anyone
            actually wants it before you build another feature.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-xl bg-brand px-6 py-3 font-medium text-paper transition-colors hover:bg-brand-deep"
            >
              Get started
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Live page in ~2 minutes
            </span>
          </div>
        </section>

        <section className="grid gap-8 py-16 md:grid-cols-3">
          {[
            ["01", "Describe it", "Answer three questions about your app, who it's for, and the pain it kills."],
            ["02", "Ship a test page", "We assemble a clean landing page at your own public URL, tracking every view and signup."],
            ["03", "Get a verdict", "Ad campaigns and your CONTINUE / PIVOT / STOP decision land here soon."],
          ].map(([n, title, body]) => (
            <div key={n} className="row-divide pb-6 md:border-b-0">
              <Label>{n}</Label>
              <h2 className="mt-3 text-xl font-medium text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-5 pb-24">
          <VerdictStamp verdict="CONTINUE" />
          <VerdictStamp verdict="PIVOT" />
          <VerdictStamp verdict="STOP" />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Coming soon
          </span>
        </section>
      </main>
    </div>
  );
}
