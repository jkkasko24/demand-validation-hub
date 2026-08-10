export type PageContent = {
  headline: string;
  subheadline: string;
  bullets: string[];
  cta_label: string;
  audience: string;
};

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "test-page";
}

export function nameFromAnswer(answer: string): string {
  const trimmed = answer.trim();
  if (/^https?:\/\//i.test(trimmed) || /^[\w-]+\.[a-z]{2,}/i.test(trimmed)) {
    const host = trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? trimmed;
    const label = host.replace(/^www\./, "").split(".")[0] ?? host;
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const words = trimmed.split(/\s+/).slice(0, 4).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function pct(views: number, signups: number): string {
  if (!views) return "0%";
  return `${((signups / views) * 100).toFixed(1)}%`;
}

export function money(cents: number, currency = "usd"): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : `${currency.toUpperCase()} `;
  const value = cents / 100;
  return `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}
