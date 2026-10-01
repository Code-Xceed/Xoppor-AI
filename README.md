# 🛰 Xoppor AI

Xoppor AI checks 15 job websites for you every 30 minutes.
When it finds something that matches your skills, it sends it to your Telegram.

It finds: **jobs, freelance work, internships, hackathons, conferences and bounties.**

⚠️ It never messages anyone. It only finds things. You decide what to apply to.

---

## 🚀 First-time setup (5 minutes, one time only)

### Step 1 — Install

You need [Node.js](https://nodejs.org) version 20 or newer. Install it first if you don't have it.

Then open a terminal and run these 3 commands:

```bash
git clone https://github.com/Code-Xceed/Xoppor-AI.git
cd Xoppor-AI
npm install
```

### Step 2 — Get your 2 free keys

**Key 1 — Gemini** (does the smart scoring)

1. Go to https://aistudio.google.com/apikey
2. Click "Create API key"
3. Copy it and keep it open in a notepad

**Key 2 — Telegram bot** (delivers your alerts)

1. Open Telegram and search for **@BotFather**
2. Send it this message: `/newbot`
3. It asks for a name — type anything, like `My Job Radar`
4. It gives you a long token like `123456:ABC-xyz...` — copy it

### Step 3 — Run setup

```bash
npm run setup
```

A wizard asks you a few questions. Just type your answer and press Enter:

| It asks | You type |
|---|---|
| Your name? | your name |
| Your role / title? | e.g. `Web Developer` |
| Your skills? | e.g. `react, python` |
| GEMINI_API_KEY? | paste Key 1 from Step 2 |
| TELEGRAM_BOT_TOKEN? | paste Key 2 from Step 2 |

**Then it shows a link to your new bot.** Click it and press **START** in Telegram.

The wizard detects your chat ID by itself and sends you a test message. When you receive it — everything works. ✅

### Step 4 — Run your first search

```bash
npm run pipeline
```

This checks all 15 websites, scores every result against your skills, and sends the best ones to Telegram. Takes 1–2 minutes.

Want to see all results in your browser too?

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

🎉 **Done.** Run `npm run pipeline` any time you want fresh opportunities.

---

## 🔁 Keep it running automatically (optional)

Two ways to search without typing anything:

**On your own PC** — open `.env`, change `SCHEDULER_ENABLED="false"` to `"true"`, then run `npm start` and leave the window open. It searches every 30 minutes.

**On GitHub (always on, free)** — push this project to your GitHub repo, then in the repo page go to **Settings → Secrets and variables → Actions** and add `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The included workflow then searches every 30 minutes, even with your PC off.

---

## 🛠 Problems?

| Problem | Fix |
|---|---|
| Setup wizard stops or shows an error | Run `npm install` first, then `npm run setup` again |
| No test message from Telegram | Did you press **START** in the bot? Bots can't message you before that. Then run `npm run setup` again |
| Dashboard says "heuristic mode" | Your Gemini key is missing or wrong — run `npm run setup` again |
| You want to change your skills later | Run `npm run setup` again, or edit `USER_KEYWORDS` in the `.env` file |
| You want to see all settings | Open the `.env` file — every setting has a comment explaining it |

Still stuck? Run `npm run benchmark` — it tests every website source and tells you what's broken.

---

## ❓ Quick answers

**Does it apply to jobs for me?** No. It only finds and scores them. You apply yourself.

**Is it free?** Yes. All websites, the AI, and GitHub Actions have free plans that are enough.

**Where do results go?** To your Telegram, and to the dashboard (`npm run dev`).

**Can I add more websites to check?** Yes. Each website is one small file in `src/lib/scouts/`. Copy one, edit it, add it to `src/lib/scouts/index.ts`. Pull requests are welcome.

---

## License

[MIT](LICENSE) — free to use and change. If Xoppor helps you land something, a ⭐ is appreciated.
