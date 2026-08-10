import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-[15px] font-medium tracking-tight text-foreground", className)}>
      demandrun<span className="text-brand">_✓</span>
    </span>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("label-mono", className)}>{children}</div>;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-paper p-6", className)}>{children}</div>;
}

const stampStyles = {
  CONTINUE: "border-brand text-brand bg-brand-tint",
  PIVOT: "border-amber text-amber bg-amber-tint",
  STOP: "border-red text-red bg-red-tint",
} as const;

export function VerdictStamp({
  verdict,
  className,
}: {
  verdict: keyof typeof stampStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block -rotate-[4deg] rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.22em]",
        stampStyles[verdict],
        className,
      )}
      style={{ borderWidth: "2.5px", borderStyle: "solid" }}
    >
      {verdict}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-paper p-5">
      <Label>{label}</Label>
      <div className="mt-2 font-mono text-3xl font-medium text-foreground">{value}</div>
      {hint ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
