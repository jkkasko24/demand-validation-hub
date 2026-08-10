# Homepage rework: condensed-impact split hero

Rebuild the public homepage (`/`) around a split-screen hero, condensed display type, and a real results section — and remove every "coming soon" label now that campaigns and verdicts actually ship.

## Locked design direction

- Palette: existing paper/ink/green tokens — paper `#F7F7F2`, ink `#16211C`, brand green `#0C8A5F`, green tint `#E1F5EE`, plus the existing amber/red stamp tints. No new colors.
- Type: Bebas Neue for display headings (condensed, tight, uppercase), Barlow for body copy. IBM Plex Mono stays for labels, metrics, metadata, and the logo.
- Layout: split-screen hero — left column is the pitch and CTA, right column is a paper "validation card" showing a live-looking test page result (views, signups, conversion, verdict stamp).

## Homepage structure

1. Header — `demandrun_✓` logo, Sign in link, and a brand-green "Get started" button.
2. Split hero — big condensed headline "YOU BUILT THE APP. NOW VALIDATE THE DEMAND." with supporting sentence and primary CTA on the left; on the right, a mock validation card with mono metric rows separated by dashed hairlines, capped by a CONTINUE stamp.
3. How it works — three steps: describe it, ship a test page, launch ads and get the verdict. Numbered mono labels, dashed dividers. Step three describes the real campaign flow instead of "coming soon".
4. Results section — the signature element. Three verdict stamps (CONTINUE / PIVOT / STOP) each paired with a one-line explanation of what triggers it and what to do next. Presented as a shipped feature.
5. Closing CTA band — green-tinted panel, condensed headline, "Get started" button.

## Copy changes

- Remove the "Coming soon" span next to the verdict stamps and the "Ad campaigns and your CONTINUE / PIVOT / STOP decision land here soon" step copy.
- Step three becomes present tense: budget-capped ad campaigns run against the test page and produce the verdict.

## Technical notes

- Add Bebas Neue and Barlow to the existing Google Fonts `<link>` in `src/routes/__root.tsx` (single stylesheet href, no CSS `@import`).
- In `src/styles.css`, add `--font-display: "Bebas Neue", ...` and set `--font-sans: "Barlow", ...` inside `@theme inline`; point the base `h1–h4` rule at `--font-display` with looser letter-spacing suited to condensed caps. Mono token unchanged.
- Rewrite `src/routes/index.tsx` only; keep its existing `head()` metadata (title/description/og) as-is.
- Reuse `Logo`, `Label`, and `VerdictStamp` from `src/components/dr.tsx` and the `card-paper` / `label-mono` / `row-divide` utilities. No component API changes.
- Scope: public homepage plus the two shared style/font touches above. Dashboard, auth, project detail, and `/t/:slug` are untouched — though they inherit the new body/heading fonts, which is intended.
