<div align="center">

# 🛰 Xoppor AI

**Finds jobs, gigs, internships, hackathons and bounties for you — scores them with AI and sends the best ones to your Telegram.**

Free · MIT · No outreach, ever — it just finds things.

</div>

---

## How it works

Every 30 minutes, Xoppor scans **15 free sources** (RemoteOK, Hacker News, Devpost, GitHub bounties, Reddit and more), filters everything through **your profile**, scores each find with **Gemini**, and sends anything above your bar straight to Telegram.

```
15 sources → AI scoring (your profile) → Telegram alert
```

---

## Get started (5 minutes)

You need [Node.js 20+](https://nodejs.org) and 2 free keys: a [Gemini key](https://aistudio.google.com/apikey) and a [Telegram bot token](https://t.me/BotFather) (send it `/newbot`).

```bash
git clone https://github.com/Code-Xceed/Xoppor-AI.git
cd Xoppor-AI
npm install
npm run setup
```

The wizard asks who you are (name, role, skills), checks your keys work, and detects your Telegram chat ID **automatically** — just paste your bot token and press START in your bot when it shows you the link.

```bash
npm run pipeline    # first run: hunt → score → alerts
npm run dev         # dashboard at http://localhost:3000
```

No keys yet? It still runs — scoring just falls back to a simpler keyword mode. Add keys later with `npm run setup` again.

---

## Daily use

| What | How |
|---|---|
| Hunt now | `npm run pipeline` |
| Browse everything | `npm run dev` → http://localhost:3000 |
| Hunt automatically | `SCHEDULER_ENABLED=true` in `.env`, then `npm start` |
| Hunt 24/7 for free | Push to GitHub, add your keys in **Settings → Secrets → Actions** — the included workflow runs every 30 min |

---

## Make it yours

The better your profile, the better the matches. The wizard writes these into `.env`:

- **Role & specialties** — what the AI judges every opportunity against
- **`USER_KEYWORDS`** — extra skills to watch for, e.g. `figma, video editing, rust`
- **`MIN_OPPORTUNITY_SCORE`** — alert threshold (default 70)

Want deeper control? Edit `src/lib/skills.ts` — keyword groups, red flags, subreddits, conference topics.

---

## Configuration

Everything lives in `.env` (the wizard creates it). Only `DATABASE_URL` is required — everything else is optional.

| Key | What it does |
|---|---|
| `DATABASE_URL` | SQLite file, `file:./dev.db` by default |
| `GEMINI_API_KEY` | AI scoring — [get it free](https://aistudio.google.com/apikey) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Where alerts go |
| `MIN_OPPORTUNITY_SCORE` | Alert threshold, default `70` |
| `SCHEDULER_ENABLED` / `SCOUT_INTERVAL_MINUTES` | Auto-hunt while `npm start` runs |
| `DIGEST_HOUR_UTC` | Daily summary hour, default `16` |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Optional, steadier Reddit access |
| `CRON_SECRET` | Set it to lock the API + dashboard with a key |

---

## Common problems

- **No Telegram messages?** Press **START** in your bot first — bots can't message you before that. Then `npm run setup` again to get a test message.
- **Scoring says "heuristic mode"?** Your Gemini key is missing or invalid — re-run `npm run setup`.
- **A source shows 0?** Sources drift. Run `npm run benchmark` to see which ones are healthy.
- **Duplicate alerts?** The database dedupes — if you deleted `prisma/dev.db`, everything looks new again.

---

## FAQ

**Is it an outreach tool?** No. It never applies or messages anyone. It finds and scores — you act.

**Does it cost anything?** No. All sources are free APIs, Gemini's free tier is enough, SQLite needs no server.

**Can I add my own sources?** Yes — each scout is a small module in `src/lib/scouts/`. Copy one, tweak it, register it in `src/lib/scouts/index.ts`. PRs welcome.

**I'm not a developer — will it work?** The matching adapts to any role via your profile. The sources lean tech, so matches will too.

---

## License

[MIT](LICENSE). If Xoppor lands you something good, a ⭐ is appreciated.
