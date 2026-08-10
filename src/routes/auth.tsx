import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo, Label } from "@/components/dr";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DemandRun" },
      { name: "description", content: "Sign in or create your DemandRun account to validate demand for your app." },
      { property: "og:title", content: "Sign in — DemandRun" },
      { property: "og:description", content: "Sign in to DemandRun and launch a test page for your app." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/app" });
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) navigate({ to: "/app" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 pt-10">
        <Label>{mode === "signup" ? "Create account" : "Welcome back"}</Label>
        <h1 className="mt-4 text-3xl font-bold text-foreground">
          {mode === "signup" ? "Start validating" : "Sign in"}
        </h1>

        {sent ? (
          <div className="card-paper mt-8 p-6">
            <Label>Check your inbox</Label>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to <span className="font-mono text-foreground">{email}</span>. Click
              it to activate your account, then come back here.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="card-paper mt-8 space-y-4 p-6">
              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-hairline bg-background px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label>Password</Label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-hairline bg-background px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-brand"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand px-6 py-3 font-medium text-paper transition-colors hover:bg-brand-deep disabled:opacity-60"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={google}
                className="w-full rounded-xl border border-hairline bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-brand-tint"
              >
                Continue with Google
              </button>
            </form>
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="mt-6 self-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
