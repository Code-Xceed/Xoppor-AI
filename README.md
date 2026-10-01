<div align="center">

# 🛰 Xoppor AI

### Your personal AI Opportunity Radar — jobs, freelance gigs, internships, hackathons, conferences & bounties, hunted 24/7 and delivered to Telegram.

**$0/month · MIT licensed · 15 live sources · 6 opportunity categories · zero outreach**

[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-8E75B2)](https://aistudio.google.com)

</div>

---

Xoppor AI is a **pure research radar — not an outreach tool**. It rigorously scouts the internet for opportunities matching *your* role, scores every one with AI against your personal profile, and pushes rich alert cards to your Telegram the moment they appear. It never applies, never messages anyone — **you decide what to act on, on your terms**.

```
    WEB SCOUTS (15 feeds) ──▶ AI MATCH RADAR ──▶ INSTANT TELEGRAM ALERTS
    JOBS & GIGS               • Gemini AI          • Match score [94/100]
    • RemoteOK                • Skill alignment    • Category + prize/budget
    • Remotive                • Buying signals     • ⏰ Deadline countdown
    • Hacker News             • Red-flag filter    • Direct link
    • WeWorkRemotely          • Deadline urgency
    • Jobicy · Himalayas      HUNT ACROSS 6 TYPES
    • Arbeitnow · LaraJobs    💼 Jobs · 🧑‍💻 Freelance · 🎓 Internships
    • NoDesk · CryptoJobs     ⚡ Hackathons · 🎤 Events/CFPs · 🪙 Bounties
    • Reddit (buyer posts)
    HACKATHONS · EVENTS · MORE
    • Devpost (prize pools + deadlines)
    • tech-conferences dataset (CFP deadlines)
    • GitHub bounty issues (paid OSS work)
    • SimplifyJobs lists (2000+ internships)
```

> **Research only, zero auto-messaging.** Xoppor AI never applies or messages anyone. It finds, filters, scores, and alerts — you decide what to act on, on your terms.

---

## 📖 User Guide

1. [Quickstart (5 minutes)](#-quickstart-5-minutes)
2. [The setup wizard](#-the-setup-wizard)
3. [Tune the radar to YOUR profile](#-tune-the-radar-to-your-profile)
4. [Get alerts on Telegram](#-get-alerts-on-telegram)
5. [What it hunts (6 categories)](#-what-it-hunts-6-categories)
6. [The 15 scout sources](#-the-15-scout-sources)
7. [How the pipeline works](#-how-the-pipeline-works)
8. [Telegram alert cards](#-telegram-alert-cards)
9. [The dashboard](#-the-dashboard)
10. [CLI commands](#-cli-commands)
11. [Run it 24/7 (free, on GitHub)](#-run-it-247-free-on-github)
12. [Configuration reference](#-configuration-reference)
13. [Troubleshooting](#-troubleshooting)
14. [FAQ](#-faq)

---

## ⚡ Quickstart (5 minutes)

**You need:** [Node.js 20+](https://nodejs.org) and a free [Gemini API key](https://aistudio.google.com/apikey) (Telegram is optional but recommended).

```bash
git clone https://github.com/Code-Xceed/Xoppor-AI.git
cd Xoppor-AI
npm install
npm run setup
```

`npm run setup` is a **one-command wizard** that:

1. Creates your `.env` (never overwrites an existing one)
2. Asks **who you are** — name, role, specialties, personal skill keywords — so the AI hunts for *your* opportunities, not generic ones
3. Validates your Gemini key live against Google
4. **Auto-connects Telegram**: paste your bot token, get a 1-click link to your bot, press START — the wizard detects your chat ID automatically and sends a live test alert (no `@userinfobot` needed)
5. Creates the SQLite database

Then run your first hunt:

```bash
npm run pipeline       # scout all 15 sources → AI-score → Telegram alerts
npm run dev            # dashboard at http://localhost:3000
```

> **No keys at all?** It still works — a built-in heuristic engine scores opportunities and Telegram is simply skipped. Add keys any time by re-running `npm run setup`.

---

## 🧙 The setup wizard

```
🛰  Xoppor AI setup

  Your name?
  > Aditya
  Your role / title? (e.g. Fullstack Developer, Data Analyst, Video Editor)
  > Fullstack Developer & AI Engineer
  Specialties? (e.g. 'React & Next.js apps, AI integrations, SaaS MVPs')
  > fullstack web apps, AI integrations, SaaS MVPs
  Extra skills/keywords to hunt for, comma-separated?
  > figma, video editing, react

Integrations — all free, all optional (Enter to skip):

  GEMINI_API_KEY? — free AI scoring, aistudio.google.com/apikey
  > •••••••• (validated live against Google ✓)
  TELEGRAM_BOT_TOKEN? — create in 60s: open t.me/BotFather → send /newbot → paste the token
  > ••••••••
  ✓ Bot connected: @your_radar_bot
  → Open https://t.me/your_radar_bot in Telegram and press START
  Detecting your chat id…
  ✓ Chat id detected automatically: 7123456789
  ✓ Confirmation sent — check your Telegram!
```

- **Press Enter** on any question to keep the current value — safe to re-run any time to retune your profile or swap keys.
- Secrets are **masked** on screen (`••••••••`). The wizard never prints them.
- EOF (Ctrl+D) at any prompt behaves like "keep current value" — the wizard can never wedge or half-write `.env`.

---

## 🎯 Tune the radar to YOUR profile

Your answers feed the radar at **three layers**:

| Layer | What you control | Effect |
|---|---|---|
| **Who you are** | Name, role, specialties (`USER_*` in `.env`) | Injected into Gemini's prompt — every opportunity is judged against *your* profile |
| **What counts as "your skill"** | `USER_KEYWORDS` (comma-separated) | Extends the scouts' detection lens — e.g. add `figma, rust` and posts mentioning them stop being filtered out |
| **Where to hunt** | 15 built-in sources, 6 categories | Role-agnostic by default; tune further in `src/lib/skills.ts` |

**Power tuning — `src/lib/skills.ts`** is the lens for the whole radar:

- `skillKeywords` — what counts as "matches my role" (11 built-in groups: fullstack, AI, data, hardware, graphics, video, …)
- `signalKeywords` / `redFlags` — urgency bonuses and penalty phrases (unpaid, on-site-only, …)
- `conferenceTopics` — which conference tracks to watch
- `subreddits` + include/exclude keywords — what the Reddit scout keeps

Edit it and the next run picks it up. Most roles never need to touch code — `USER_KEYWORDS` covers it.

---

## 📨 Get alerts on Telegram

1. Open [@BotFather](https://t.me/BotFather) in Telegram → send `/newbot` → follow the prompts (60 seconds)
2. Copy the bot token → paste it into the wizard
3. Open the deep link the wizard prints → **press START** in your bot
4. The wizard detects your chat ID, saves both values, and sends a live confirmation

That's it — every run, opportunities scoring ≥ your threshold land in your chat. The daily digest arrives at `DIGEST_HOUR_UTC` (default 16:00 UTC).

> Already have a bot? Just paste its token — the wizard detects old messages too, so users who already pressed START are found instantly. If a webhook blocks detection, the wizard offers to clear it and retries.

---

## 🗂 What it hunts (6 categories)

| Category | Sources | Example alert |
|---|---|---|
| 💼 Jobs | 11 job boards + Reddit | "Senior Fullstack Engineer — $150k–$180k — Remote" |
| 🧑‍💻 Freelance | Reddit (r/forhire, r/freelance_forhire, …), job boards | "[Hiring] Need Next.js dashboard — $3k budget" |
| 🎓 Internships | SimplifyJobs Summer lists (2000+ roles, daily-updated) | "Stripe — Summer 2027 Internship — Remote" |
| ⚡ Hackathons | Devpost API (prize pools, deadlines, themes) | "Amazon Developer Hackathon — $138k prizes — 23 days left" |
| 🎤 Events & CFPs | tech-conferences open dataset (8 topics) | "CFP open: AI Coding Summit — deadline Jan 26" |
| 🪙 Bounties | GitHub search (Algora-style funded issues) | "Fix auth flow — $500 bounty — repo: acme/sdk" |

Every opportunity carries a **category**, and anything with a deadline (hackathons, CFPs, events) gets a **⏰ countdown** in the Telegram card and dashboard.

---

## 🛠 The 15 scout sources

| # | Source | What it provides |
|---|---|---|
| 1 | RemoteOK API | Real-time remote tech positions |
| 2 | Remotive API | Curated remote software & AI roles |
| 3 | Hacker News (Algolia) | Monthly "Who is hiring?" + "Freelancer?" threads |
| 4 | WeWorkRemotely (RSS) | 5 programming/contract feeds |
| 5 | Jobicy (RSS) | Tech and freelance opportunities |
| 6 | Himalayas (RSS) | Curated remote developer roles |
| 7 | Arbeitnow (API) | Remote engineering positions |
| 8 | LaraJobs (RSS) | Fullstack remote roles with salary tags |
| 9 | NoDesk (RSS) | Remote jobs & digital-nomad roles |
| 10 | CryptoJobsList (RSS) | Web3, AI & remote engineering roles |
| 11 | Reddit | 8 work-request subreddits, buyer/seller filtered |
| 12 | Devpost API | Open hackathons with prize pools & deadlines |
| 13 | tech-conferences dataset | Developer conferences across 8 topics with CFP deadlines |
| 14 | GitHub Search API | Funded issues: bounty labels, Algora, paid contributions |
| 15 | SimplifyJobs (GitHub) | Summer 2026/2027 tech internship lists, updated daily |

All sources are free, public APIs — no scraping behind login walls, no key required (Reddit OAuth optional for better rate limits).

---

## 🔄 How the pipeline works

```
scout → score → alert → digest      (every 30 min via scheduler or GitHub Actions)
```

1. **Scout** — 15 public feeds scanned per run, deduped by source + external ID.
2. **Score** — Gemini evaluates every opportunity against your profile; a keyword heuristic takes over whenever AI is unavailable or rate-limited (circuit breaker + model fallback chain — the radar never stalls).
3. **Alert** — anything scoring ≥ `MIN_OPPORTUNITY_SCORE` (default 70) goes straight to Telegram with score, category, budget/prize, signals, matched skills, and deadline countdown.
4. **Digest** — daily Telegram summary: today's finds, hot opportunities by category, and the top 4.

---

## 📱 Telegram alert cards

- 🎯 **Match score** with urgency emoji
- 🗂 **Category** (job / freelance / internship / hackathon / event / bounty)
- 💰 **Budget / salary / prize pool** (labeled per category)
- ⏰ **Deadline countdown** — "3 days left", "due today ⚠️"
- 🧠 **AI match analysis** — why this fits *your* profile
- ⚡ **Buying/urgency signals** and 🏷️ matched skill hashtags
- 🔗 **1-click link** to the original post

---

## 💻 The dashboard

```bash
npm run dev        # http://localhost:3000
```

- **Category tabs** — flip between 💼 jobs, 🧑‍💻 freelance, 🎓 internships, ⚡ hackathons, 🎤 events, 🪙 bounties
- **Deadline badges** — ⏰ countdown, red highlighting inside 7 days
- **Stats cards** — totals, today's finds, hot count, per-category breakdown
- **Status filter + search + CSV export + load-more pagination**
- **Manual entry** — paste an opportunity, get an instant AI score
- **Detail drawer** — score breakdown, matched skills/signals, notes, archive/reject, re-send to Telegram
- **Settings** — integration health, Telegram test, dashboard access key

---

## 🖥 CLI commands

```bash
npm run setup       # Interactive onboarding wizard (profile + keys + DB)
npm run pipeline    # Full run: scout all 15 feeds → score → Telegram alerts
npm run scout       # Fetch latest opportunities into the DB only
npm run score       # Score pending opportunities + dispatch Telegram alerts
npm run digest      # Send the daily digest to Telegram
npm run benchmark   # Live benchmark of all 15 scouts, AI latency, Telegram
npm run dev         # Dashboard at http://localhost:3000
npm test            # Run the test suite (24 offline unit tests)
npm run typecheck   # Validate TypeScript compilation
npm run build       # Build the Next.js production app
```

---

## 🌍 Run it 24/7 (free, on GitHub)

The repo ships with a GitHub Actions workflow that runs the full pipeline every 30 minutes on GitHub's free runners — **no server needed**:

1. Push this repo to your GitHub (or fork it)
2. **Settings → Secrets and variables → Actions** → add:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `MIN_OPPORTUNITY_SCORE` *(optional)*
   - `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` *(optional)*
3. The workflow commits the SQLite DB back to the repo, so opportunities are never re-alerted
4. Enable the workflow in the **Actions** tab (it also supports manual runs via `workflow_dispatch`)

**Alternative — local scheduler:** set `SCHEDULER_ENABLED="true"` and run `npm start` — full cycles every `SCOUT_INTERVAL_MINUTES`, digest at `DIGEST_HOUR_UTC`.

---

## ⚙️ Configuration reference (`.env`)

Everything except `DATABASE_URL` is optional. `npm run setup` writes this file for you.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite database (relative to `prisma/`) |
| `USER_NAME` / `USER_TITLE` / `USER_BIO` / `USER_PORTFOLIO` | — | **Your profile** — the AI scores every opportunity against this |
| `USER_KEYWORDS` | — | Extra skill keywords, comma-separated — extends the scouts' lens |
| `GEMINI_API_KEY` | — | Free AI key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-flash-latest` | Rolling alias → always a live flash model |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | — | From @BotFather (auto-detected by the wizard) |
| `MIN_OPPORTUNITY_SCORE` | `70` | Telegram alert threshold (0–100) |
| `SCHEDULER_ENABLED` | `false` | Run the radar automatically while `npm start` is up |
| `SCOUT_INTERVAL_MINUTES` | `30` | Scheduler cycle length |
| `DIGEST_HOUR_UTC` | `16` | Hour (UTC) the daily digest fires |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | — | Script app for reliable Reddit API access |
| `SCOUT_USER_AGENT` | — | Custom User-Agent for scout requests |
| `CRON_SECRET` | — | When set, locks **all** API endpoints + dashboard |

### 🔒 Security (public deployments)

1. Set `CRON_SECRET` in `.env` → **all** API endpoints require the key.
2. Open **Settings** in the dashboard, paste the same value as your **access key** — stored in that browser only, auto-attached to every request.
3. Crons can call `/api/scout?key=…` and `/api/digest?key=…` (or send `x-cron-key`).

---

## 🧯 Troubleshooting

**Reddit scout returns 0 signals** — Reddit blocks unauthenticated `.json` endpoints. The scout falls back to `.rss` automatically; for full reliability add free OAuth creds ([reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → script app). Check the dashboard's Settings page for live source health.

**A source shows 0 for a long time** — sources drift. Run `npm run benchmark` to see per-source latency and signal counts, then check whether the upstream site changed its format.

**No Telegram alerts but the bot is connected** — did you press **START** in the bot? Telegram bots cannot message users who never started the chat. Re-run `npm run setup` — it sends a live test message so you can confirm delivery.

**AI scoring says "heuristic mode"** — `GEMINI_API_KEY` is missing or invalid. The wizard validates it live; re-run `npm run setup` to fix. Free-tier rate limits trigger automatic fallback + a circuit breaker, so scoring never stalls.

**Gemini model errors (404/503)** — the radar tries a fallback chain automatically (`gemini-flash-latest` → `gemini-3.5-flash-lite` → …) with a 60s cooldown per model. Persistent 401/403 means the key itself is bad.

**Duplicate alerts** — the DB dedupes by source + external ID; if you delete `prisma/dev.db` between runs, everything looks new again. In GitHub Actions mode the DB is committed back automatically.

**`prisma db push` fails on a fresh clone** — run `npm run setup` (it regenerates the Prisma client even if `npm install`'s postinstall was blocked). Also check that `DATABASE_URL` is set — `file:./dev.db` is the default.

**Windows notes** — use bash (Git Bash) for commands; all scripts are POSIX-compatible and tested on Windows.

---

## ❓ FAQ

**Is this an outreach / cold-messaging tool?**
No — deliberately. Xoppor AI is a **research radar**: it finds, scores and alerts. It never applies, emails, or messages anyone. You act on opportunities manually, on your terms.

**Does it cost anything?**
$0. Every source is a free public API, Gemini's free tier handles scoring, GitHub Actions runners are free, and SQLite needs no database server.

**How is this different from just browsing job boards?**
The radar scans 15 sources every 30 minutes, dedupes, filters to your skills, scores against *your* profile, ranks by urgency/deadline, and pushes only the strong matches to your pocket — 24/7, while you do other things.

**Will my keys be committed to git?**
No. `.gitignore` excludes every `.env*` except `.env.example`. Double-check with `git status` before your first push.

**Can I add my own sources?**
Yes — each scout is a small module in `src/lib/scouts/` implementing a `run()` that returns normalized `ScoutSignal`s. Copy an existing scout, register it in `src/lib/scouts/index.ts`, and it joins the next run, the dashboard tabs, and the digest automatically.

**Can I use it for a non-developer role (designer, marketer, video editor)?**
Mostly — set `USER_TITLE`/`USER_BIO`/`USER_KEYWORDS` and the scoring adapts immediately. The 15 built-in sources skew tech, so a truly multi-profession source pack is a natural contribution (PRs welcome!).

**How do I change what "my skills" means?**
`USER_KEYWORDS` in `.env` for quick additions; `src/lib/skills.ts` for full control of keyword groups, signals, red flags, subreddits and conference topics.

**Does the dashboard need to be running for alerts?**
No — alerts fire from `npm run pipeline` / the scheduler / GitHub Actions. The dashboard is just a browser over the same database.

---

## 🤝 Contributing

PRs welcome! Good first issues: new scout sources, new category packs, per-category Telegram mute filters, deadline re-alerts. Please run `npm run typecheck && npm test` before submitting.

## 📄 License

[MIT](LICENSE) — free to use, modify, and ship. If Xoppor AI lands you an opportunity, a ⭐ on the repo is the best thanks.
