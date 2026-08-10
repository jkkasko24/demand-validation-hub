# Demand Validation Hub

Build a web app called DemandRun — a demand-validation tool for indie builders who ship apps with AI tools. The product promise: "You built the app. Now validate the demand." Users describe their app, DemandRun generates a hosted test landing page with signup tracking built in, and (in a later phase, not this build) launches ad campaigns and delivers a decision: CONTINUE, PIVOT, or STOP.

This build is Phase 1 only. Build exactly what's specified here. Where campaign features are mentioned, they appear as disabled/preview UI clearly labeled "coming soon" — do not build any ad-platform integration, background jobs, or campaign logic.

Design system — follow exactly

Fonts: Space Grotesk (headings, UI, weights 400/500/700) and IBM Plex Mono (labels, data, metadata, weights 400/500), both from Google Fonts.

Colors: background #F7F7F2 (paper), primary text #16211C (ink), secondary text #4A574F, borders/hairlines #DDE3DC, cards #FFFFFF, brand green #0C8A5F, deep green #085041, green tint #E1F5EE, amber #C77F14 with tint #FAEEDA, red #C0392B with tint #FAE7E4.

Feel: clean, light, generous whitespace, 12–16px border radius on cards, dashed hairline dividers between data rows, mono font for all labels/keys/metadata in uppercase-tracking style. No gradients, no stock imagery, no illustrations.

Logo: the text demandrun_✓ in IBM Plex Mono, with the _✓ in brand green.

Verdict stamps are a signature element: mono font, letter-spaced uppercase word in a 2.5px-bordered rounded rectangle, rotated about -4 degrees. CONTINUE = green, PIVOT = amber, STOP = red.

Buttons: ink background with paper text, hover to deep green. Primary CTAs may use brand green.

Stack

Use Supabase for auth, database, and storage. Email + Google sign-in. Row-level security: users can only read/write their own rows. Public routes must not require auth.

Database schema — create exactly these tables

sql

projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  app_url text,
  category text,
  positioning jsonb,          -- {audience, pain, pitch, tone}
  created_at timestamptz default now()
)

landing_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  slug text unique not null,
  content jsonb not null,     -- see landing page content shape below
  published boolean default false,
  created_at timestamptz default now()
)

page_views (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid references landing_pages not null,
  utm_source text, utm_campaign text, utm_content text,
  created_at timestamptz default now()
)

signups (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid references landing_pages not null,
  email text not null,
  utm_source text, utm_campaign text, utm_content text,
  created_at timestamptz default now()
)

page_views and signups must be insertable from the public (unauthenticated) landing pages, but only readable by the project owner.

Routes and screens

1. / — marketing home (public)

A simple version: hero with the headline "You built the app. Now validate the demand.", one paragraph, and a "Get started" button to sign up. Keep it minimal — a fuller marketing site exists separately.

2. /app — dashboard (auth required)

Lists the user's projects as cards: project name, app URL, landing page status (draft/live), total signups, a mono-font mini stat row (views, signups, conversion %). Primary button: "New validation". Empty state: "No validations yet. Describe your app and get a live test page in two minutes." with the same button.

3. /app/new — setup chat (auth required)

A chat-style guided flow (scripted UI, not an LLM — just a stepped form styled as a conversation):

Bot bubble asks for the app URL or a one-line description → text input.

Bot asks "Who do you picture using it?" → tappable chips: Busy professionals / Students / Indie builders / Parents / Honestly not sure (+ a free-text "other" chip).

Bot asks "What's the main pain it solves?" → short text input.

Then a "building your test page" moment: an animated checklist (mono font, items ticking: "Wrote your positioning", "Generated your test page", "Wired up signup tracking") — purely visual, ~3 seconds.

Creates a projects row and a landing_pages row with a slug derived from the app name (deduplicate with a numeric suffix), and content assembled from the answers using this shape:

json

{
  "headline": "<pitch or app name>",
  "subheadline": "<pain-focused one-liner from answers>",
  "bullets": ["<benefit 1>", "<benefit 2>", "<benefit 3>"],
  "cta_label": "Join the early list",
  "audience": "<chip answer>"
}

Ends by navigating to the project detail screen.

4. /app/project/:id — project detail (auth required)

Three sections:

Test page: preview card of the landing page, its public URL shown in mono font with a copy button, publish/unpublish toggle, and an "Edit content" panel (form fields for headline, subheadline, bullets, CTA label — saving updates the JSON).

Results: stat tiles (Views, Signups, Conversion rate) plus a table of signups (email, source, date) and a small breakdown of signups by utm_source. Include a "Share tracked link" helper: shows the page URL with ?utm_source=x&utm_content=y appended, with two preset buttons ("X / Twitter link", "Reddit link") that fill utm_source accordingly, and a copy button.

Campaigns — coming soon: a visually disabled card with the text "Ad campaigns, autopilot, and your CONTINUE / PIVOT / STOP decision launch here soon." showing the three verdict stamps (CONTINUE green, PIVOT amber, STOP red) as static styled elements. No functionality.

5. /t/:slug — public test landing page (no auth, mobile-first)

Rendered from the landing_pages.content JSON in the DemandRun design system: headline, subheadline, three benefit bullets with green check marks, an email input + CTA button, and a small footer line "page by demandrun_✓". Behavior:

On load, insert a page_views row capturing utm_source, utm_campaign, utm_content from the URL query string.

On submit, validate the email, insert a signups row with the same UTM values, and show a success state: "You're in. ✓" replacing the form.

If the page's published is false, show a plain "This page isn't live." message.

This page must be fast, clean, and contain no DemandRun navigation — it represents the user's app, not ours.

Explicitly out of scope — do not build

No ad platform connections or OAuth to Meta/Google. No campaign creation, budgets, or spend logic. No background jobs or cron. No LLM/API calls — the setup chat is a scripted form. No payments. No email sending. No admin panel.

Acceptance checklist

A new user signs up, completes the setup chat in under two minutes, and gets a live public page at /t/<slug>.

Visiting /t/<slug>?utm_source=reddit&utm_content=angle-a records a page view with those values; submitting the form records a signup with them.

The project detail screen shows correct view/signup counts and the per-source breakdown updates as data arrives.

Unpublished pages are not viewable publicly; users can never see other users' projects or signups.

Everything follows the design system above — if a screen looks like a generic admin template, it's wrong.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39404437-51d3-4c22-b835-b3f94d582f20).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
