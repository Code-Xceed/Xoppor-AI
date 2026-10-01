# 🛰️ Xoppor AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=20](https://img.shields.io/badge/Node->=20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-33%20passed-success.svg)](tests/)

**Xoppor AI** is an autonomous, open-source opportunity radar that continuously scouts 16 platforms across the internet for engineering contracts, client projects, high-yield startup roles, bounties, and hackathons.

When it detects high-conviction opportunities matching your specific skills and compensation expectations, it evaluates them using Google Gemini and delivers formatted Opportunity Cards directly to your private Telegram.

> **Research Radar Only:** Xoppor AI strictly identifies, aggregates, deduplicates, and evaluates leads. It **never** auto-applies or auto-messages anyone. You retain 100% control over which opportunities you pursue.

---

## ⚡ Key Highlights

* 🌐 **16 Multi-Platform Scouts:** Collects ~1,500+ live signals per sweep across public APIs, RSS feeds, tech forums, and developer boards.
* 🧠 **Gemini AI Evaluator:** Analyzes company credibility, stated budget, required skills, and role intent in ~1.5s per opportunity.
* 🔄 **Cross-Source Deduplication:** Merges identical postings appearing on multiple job boards into a single high-conviction alert.
* 💰 **Intelligent Budget Harvester:** Extracts compensation (`$150k-$180k`, `€70k-€95k`, `$60-$90/hr`) directly from titles and descriptions even when feeds lack structured salary tags.
* 📱 **Rich Telegram Alerts:** Formatted opportunity cards with role, company, budget, direct links, key buying signals, and AI rationale.
* ☁️ **100% Free 24/7 Cloud Mode:** Runs entirely on GitHub's free Actions runners—no server, VPS, or running laptop required.
* 🖥️ **Local Web Dashboard:** Clean Next.js dashboard at `localhost:3000` to browse, search, and filter opportunities by category and source.

---

## 📡 Scout Coverage (16 Built-in Engines)

| Category | Platforms Scouted | What It Discovers |
| :--- | :--- | :--- |
| **Remote Tech Jobs** | **RemoteOK**, **Remotive**, **WeWorkRemotely**, **Jobicy**, **Himalayas**, **Arbeitnow**, **LaraJobs**, **NoDesk**, **Working Nomads** | 100% remote software engineering, fullstack, backend, frontend, devops, and AI roles. |
| **Client & Freelance** | **Hacker News** (*"Who is hiring?"* & *"Seeking Freelancer"*), **Reddit** (*r/forhire*, *r/remotejs*, *r/jobbit*) | Direct client contract posts, MVP builds, freelance gigs, and direct email contacts. |
| **Web3 & AI** | **CryptoJobsList** | High-paying distributed systems, Rust, smart contract, and AI agent engineering roles. |
| **Hackathons** | **Devpost** | Open competitions and hackathons with verified prize pools ($50k–$150k+). |
| **Open Source** | **GitHub Funded Bounties** | Algora and open-source bounty issues with paid rewards. |
| **Events & CFPs** | **Tech Conferences** | Tech conferences with open Call-for-Papers (CFP) speaker opportunities. |
| **Early Career** | **Simplify Internships** | Curated high-volume software, AI, and data internships. |

---

## 📲 What Telegram Alerts Look Like

When Xoppor AI finds an opportunity scoring $\ge 70$, it sends an alert formatted like this:

```text
🎯 Score: 95/100 · Tier: HOT
💼 Senior Fullstack Engineer (Next.js, Python, AI Agents)
🏢 Nexus AI Labs
🌐 Source: WeWorkRemotely · 📍 Remote worldwide
💰 Budget: $150k - $180k

📋 Project Overview:
Seed-stage AI startup looking for an experienced fullstack engineer
to build our autonomous agent workflow platform. Must have Next.js,
Python, and LangChain experience...

🧠 AI Match Analysis:
Exceptional match aligning with fullstack, Next.js, Python, and AI
agent engineering skills with high stated compensation.

⚡ Key Signals:
• $150k-$180k salary range
• Seed-stage funded AI startup
• Remote worldwide

🏷️ Matched Skills:
#fullstack #aiEngineering #saasMvp

🔗 Direct Application Link:
https://weworkremotely.com/remote-jobs/...
```

---

## 🚀 Quickstart Guide (5 Minutes)

### Step 1 — Clone & Install

Ensure you have **Node.js 20+** installed:

```bash
git clone https://github.com/Code-Xceed/Xoppor-AI.git
cd Xoppor-AI
npm install
```

### Step 2 — Obtain Your 2 Free Keys

1. **Google Gemini Key** (Free): Get it at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. **Telegram Bot Token** (Free): Open Telegram, message **@BotFather**, send `/newbot`, and copy your bot token.

### Step 3 — Run the Automated Setup Wizard

```bash
npm run setup
```

The interactive wizard will guide you through:
* Your **Name**, **Job Title**, and **Skills** (e.g. `react, python, ai, figma`).
* Your **Gemini API Key** and **Telegram Bot Token**.
* A 1-click link to start your Telegram bot—the wizard automatically detects your Chat ID and sends a live test alert to verify connectivity!

### Step 4 — Run Your First Sweep

```bash
npm run pipeline
```

To view all discovered opportunities in your browser:
```bash
npm run dev
```
Open **`http://localhost:3000`** to browse and filter stored leads.

---

## ☁️ 100% Free 24/7 Cloud Runner (GitHub Actions)

You don't need a dedicated server, VPS, or your computer turned on. You can run Xoppor AI on GitHub's free hosted runners:

1. **Fork this repository** to your GitHub account.
2. In your repo, navigate to **Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**.
3. Add the following 3 secrets:
   * `GEMINI_API_KEY`: Your Google AI Studio key.
   * `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
   * `TELEGRAM_CHAT_ID`: Your personal Telegram chat ID.
4. Go to the **Actions** tab and enable the workflow.

The included workflow (`.github/workflows/cron.yml`) runs every 30 minutes, pulls new signals, evaluates matches, and alerts your phone.

---

## 🛠️ CLI Commands & Testing

| Command | Action |
| :--- | :--- |
| `npm run pipeline` | Run full cycle: scout 16 platforms ➔ deduplicate ➔ score with AI ➔ dispatch Telegram alerts. |
| `npm run scout` | Poll all 16 platforms and save new opportunities to SQLite without scoring. |
| `npm run score` | Score pending opportunities with Gemini and alert on matches $\ge 70$. |
| `npm run benchmark` | Test latency, yield, company extraction, budget detection, and AI scoring across all platforms. |
| `npm run test` | Run the complete unit test suite (33 tests). |
| `npm run typecheck` | Run full TypeScript type verification (`tsc --noEmit`). |
| `npm run build` | Compile Next.js for production. |
| `npm start` | Run production Next.js server with optional background scheduler. |

---

## 🎯 How to Customize Your Radar

You can tune Xoppor AI to any profession or skill set by editing `.env`:

```env
# Your profile (informs the Gemini AI evaluation prompt)
USER_TITLE="Senior Mobile Engineer"
USER_BIO="specializing in Flutter, React Native, Swift, and modern mobile apps"
USER_KEYWORDS="flutter, react native, swift, ios, android, kotlin"

# Alert sensitivity (0-100)
MIN_OPPORTUNITY_SCORE="75"
```

---

## 🧱 Architecture & Data Flow

```text
 ┌────────────────────────────────────────────────────────┐
 │                   16 Web Scouts                        │
 │  RemoteOK · Remotive · HN · WWR · Jobicy · Himalayas   │
 │  Arbeitnow · LaraJobs · NoDesk · CryptoJobs · Nomads   │
 │  Devpost · Conferences · Bounties · Internships · Reddit│
 └──────────────────────────┬─────────────────────────────┘
                            │ Raw Signals (~1,500+)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │           Cross-Source Deduplication & Filter          │
 │  • URL Canonicalization & Tracking Param Stripping     │
 │  • Company + Title Similarity Clustering               │
 │  • Multi-Source Corroboration Scoring Boost            │
 └──────────────────────────┬─────────────────────────────┘
                            │ Unique Leads
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               Gemini AI Scoring Engine                 │
 │  • Technical Skill Overlap Check                       │
 │  • Compensation & Budget Sanity Evaluation             │
 │  • Commercial Intent & Conviction Extraction           │
 └──────────────────────────┬─────────────────────────────┘
                            │ High Matches (>= 70)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                 Telegram Notification                  │
 │  • Rich Executive Dossier Cards                        │
 │  • HTML Entity Error Fallback                          │
 │  • Sent-state Persistence in SQLite (Zero Duplicates)  │
 └────────────────────────────────────────────────────────┘
```

---

## ❓ Frequently Asked Questions

**Does Xoppor AI apply to jobs or pitch clients for me?**
No. It acts strictly as an automated research radar. It scouts, filters, and analyzes postings, then sends you the exact application link and direct contact info so you can apply personally.

**Is it really free?**
Yes. All 16 public feeds require zero paid subscriptions. Google Gemini provides a generous free tier for text reasoning. Telegram bot messaging is free. GitHub Actions provides 2,000 free minutes/month for scheduled runs.

**Can I run it on Windows, macOS, and Linux?**
Yes. Xoppor AI is written in cross-platform TypeScript on Node.js 20+ with zero native binary compilation requirements.

---

## 📄 License

Distributed under the **[MIT License](LICENSE)**. Free for personal and commercial use. If Xoppor AI helps you land an opportunity, starring the repository ⭐ is appreciated!
