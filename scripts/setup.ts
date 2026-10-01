/**
 * One-command onboarding for fresh clones:
 *   1. creates .env from .env.example (never overwrites an existing one)
 *   2. interactive wizard — asks WHO you are and WHAT you do, so the AI
 *      scores opportunities against your personal profile
 *   3. Telegram auto-connect: validates the bot token, gives a 1-click
 *      deep link, detects the chat ID automatically and sends a live
 *      confirmation message — no @userinfobot needed
 *   4. creates/updates the SQLite database from the Prisma schema
 *
 * Re-running is always safe: blank answers keep existing values.
 * EOF on stdin (Ctrl+D / piped input) also keeps existing values, so the
 * wizard can never wedge or half-write .env.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { stdin } from "node:process";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip characters that would break the .env quoting. */
const clean = (s: string) => s.replace(/["\\\r\n]/g, " ").trim();

// ── EOF-safe line reader (works for TTY *and* piped input) ─────────────────

const lineQueue: string[] = [];
let inputClosed = false;
let waiter: ((line: string) => void) | null = null;

const rl = createInterface({ input: stdin });
rl.on("line", (line) => {
  if (waiter) {
    const resolve = waiter;
    waiter = null;
    resolve(line);
  } else {
    lineQueue.push(line);
  }
});
rl.on("close", () => {
  inputClosed = true;
  if (waiter) {
    const resolve = waiter;
    waiter = null;
    resolve(""); // EOF behaves like "press Enter" → keep current value
  }
});

/** Next input line, or "" on EOF. Never hangs, never rejects. */
function nextLine(): Promise<string> {
  if (lineQueue.length > 0) return Promise.resolve(lineQueue.shift() as string);
  if (inputClosed) return Promise.resolve("");
  return new Promise((resolve) => {
    waiter = resolve;
  });
}

/** Mask a secret for display: keep only the last 4 characters. */
const mask = (s: string) => (s.length > 8 ? `••••••••${s.slice(-4)}` : "••••••••");

/** Ask a question; blank answer (or EOF) keeps the current value. */
async function ask(question: string, current: string, secret = false): Promise<string> {
  const shown = secret ? mask(current) : current;
  const hint = shown ? ` (current: ${shown})` : "";
  process.stdout.write(`  ${question}${hint}\n  > `);
  const answer = clean(await nextLine());
  process.stdout.write("\n");
  return answer || current;
}

// ── .env helpers ────────────────────────────────────────────────────────────

function getEnvVar(contents: string, key: string): string {
  const m = contents.match(new RegExp(`^${key}="(.*)"$`, "m"));
  return m ? m[1] : "";
}

function setEnvVar(contents: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(contents)) return contents.replace(re, `${key}="${value}"`);
  return `${contents.trimEnd()}\n${key}="${value}"\n`;
}

// ── Telegram helpers (bot API — no auth beyond the token) ──────────────────

type TgResponse = {
  ok?: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
};

async function tgApi(token: string, method: string, body?: object): Promise<TgResponse> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    return (await res.json()) as TgResponse;
  } catch {
    return {};
  }
}

/** Returns the bot's @username if the token is valid, else null. */
async function validateBot(token: string): Promise<string | null> {
  const data = await tgApi(token, "getMe");
  const username = (data.result as { username?: string } | undefined)?.username;
  return data.ok && username ? username : null;
}

/**
 * Poll getUpdates until ANY message arrives (old messages count too, so
 * users who already pressed START are detected instantly).
 * Returns the chat id, "__WEBHOOK_CONFLICT__", or null on timeout.
 */
async function detectChatId(token: string, timeoutMs = 180_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write("  ");
  while (Date.now() < deadline) {
    const data = await tgApi(token, "getUpdates", { timeout: 0, allowed_updates: ["message"] });
    if (data.ok) {
      const updates = (data.result as { message?: { chat?: { id?: number } } }[] | undefined) ?? [];
      for (const u of updates) {
        const chatId = u?.message?.chat?.id;
        if (chatId !== undefined) return String(chatId);
      }
    } else if (data.error_code === 409) {
      return "__WEBHOOK_CONFLICT__";
    }
    process.stdout.write(".");
    await sleep(2_000);
  }
  return null;
}

// ── Main wizard ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🛰  Xoppor AI setup\n");

  // 1. Ensure .env exists (never overwrite a real one).
  if (!existsSync(".env")) {
    copyFileSync(".env.example", ".env");
    console.log("✓ Created .env from .env.example\n");
  } else {
    console.log("• .env found — press Enter on any question to keep the current value\n");
  }
  let env = readFileSync(".env", "utf8");

  // 2. Profile wizard — this is the lens the whole radar uses.
  console.log("Tell the radar who you are, so it hunts for YOUR opportunities:\n");

  const name = await ask("Your name?", getEnvVar(env, "USER_NAME"));
  const title = await ask(
    "Your role / title? (e.g. Fullstack Developer, Data Analyst, Video Editor)",
    getEnvVar(env, "USER_TITLE") || "Software Developer"
  );
  const bio = await ask("Specialties? (e.g. 'React & Next.js apps, AI integrations, SaaS MVPs')", getEnvVar(env, "USER_BIO"));
  const portfolio = await ask("Portfolio URL? (optional)", getEnvVar(env, "USER_PORTFOLIO"));
  const keywords = await ask(
    "Extra skills/keywords to hunt for, comma-separated? (e.g. 'figma, video editing, react, data analysis')",
    getEnvVar(env, "USER_KEYWORDS")
  );

  // 3. Gemini key (with a quick validity check).
  console.log("\nIntegrations — all free, all optional (Enter to skip):\n");

  let geminiKey = await ask("GEMINI_API_KEY? — free AI scoring, aistudio.google.com/apikey", getEnvVar(env, "GEMINI_API_KEY"), true);
  if (geminiKey) {
    try {
      const probe = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      console.log(
        probe.ok
          ? "  ✓ Gemini key valid"
          : "  ✗ Gemini key rejected by Google — AI scoring will fall back to heuristics"
      );
      if (!probe.ok) geminiKey = "";
    } catch {
      console.log("  ⚠ Could not reach Google to verify the key — saved as-is");
    }
  }

  // 4. Telegram: token → validate → auto-detect chat → live test message.
  console.log("\nTelegram alerts — free, ~60 seconds to set up (Enter to skip):");

  let tgToken = await ask(
    "TELEGRAM_BOT_TOKEN? — create in 60s: open t.me/BotFather → send /newbot → paste the token",
    getEnvVar(env, "TELEGRAM_BOT_TOKEN"),
    true
  );
  let tgChat = getEnvVar(env, "TELEGRAM_CHAT_ID");

  if (tgToken) {
    const username = await validateBot(tgToken);
    if (!username) {
      console.log("  ✗ Token rejected by Telegram — double-check it (format: 123456:AA…). Skipping alerts.");
      tgToken = "";
    } else {
      console.log(`  ✓ Bot connected: @${username}`);

      if (tgChat) {
        // Already fully configured — just verify delivery.
        const sent = await tgApi(tgToken, "sendMessage", {
          chat_id: tgChat,
          text: "🛰 Xoppor AI radar connected — opportunity alerts will arrive here.",
        });
        console.log(
          sent.ok
            ? "  ✓ Test alert delivered — check your Telegram!"
            : "  ⚠ Could not deliver to that chat id — did you press START in your bot? Re-run setup to fix."
        );
      } else {
        console.log(`\n  → Open https://t.me/${username} in Telegram and press START (or send any message).`);
        console.log("  Detecting your chat id (press Ctrl+C to abort)…");
        let detected = await detectChatId(tgToken);

        if (detected === "__WEBHOOK_CONFLICT__") {
          console.log("\n  ⚠ A webhook is set on this bot, which blocks chat detection.");
          const fix = clean(await ask("Remove the webhook and continue? y/N", "")).toLowerCase();
          if (fix === "y" || fix === "yes") {
            await tgApi(tgToken, "deleteWebhook", { drop_pending_updates: false });
            console.log("  Detecting your chat id…");
            detected = await detectChatId(tgToken);
          }
        }

        if (detected && detected !== "__WEBHOOK_CONFLICT__") {
          tgChat = detected;
          console.log(`\n  ✓ Chat id detected automatically: ${tgChat}`);
          const sent = await tgApi(tgToken, "sendMessage", {
            chat_id: tgChat,
            text: "✅ Xoppor AI radar connected! Opportunity alerts will arrive here.",
          });
          if (sent.ok) console.log("  ✓ Confirmation sent — check your Telegram!");
        } else {
          console.log("\n  ⚠ No message detected in time. Enter the chat id manually (from @userinfobot), or leave blank:");
          tgChat = clean(await ask("Chat id", ""));
        }
      }
    }
  }

  const currentScore = getEnvVar(env, "MIN_OPPORTUNITY_SCORE") || "70";
  const scoreRaw = clean(await ask(`Minimum alert score 0-100?`, currentScore));
  const minScore = /^\d{1,3}$/.test(scoreRaw) ? scoreRaw : currentScore;

  env = setEnvVar(env, "USER_NAME", name);
  env = setEnvVar(env, "USER_TITLE", title);
  env = setEnvVar(env, "USER_BIO", bio);
  env = setEnvVar(env, "USER_PORTFOLIO", portfolio);
  env = setEnvVar(env, "USER_KEYWORDS", keywords);
  env = setEnvVar(env, "GEMINI_API_KEY", geminiKey);
  env = setEnvVar(env, "TELEGRAM_BOT_TOKEN", tgToken);
  env = setEnvVar(env, "TELEGRAM_CHAT_ID", tgChat);
  env = setEnvVar(env, "MIN_OPPORTUNITY_SCORE", minScore);
  writeFileSync(".env", env);
  rl.close();

  console.log("\n✓ Profile saved to .env");

  // 5. Database (push is idempotent; also regenerates the Prisma client so a
  // blocked postinstall during `npm install` can never leave a stale client).
  console.log("• Creating SQLite database…");
  const push = spawnSync("npx", ["prisma", "db", "push"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (push.status !== 0) {
    console.error("\n✗ Database setup failed — check the Prisma output above.");
    process.exit(1);
  }

  // 6. Wrap up.
  const missing: string[] = [];
  if (!geminiKey) missing.push("GEMINI_API_KEY      (free AI scoring — aistudio.google.com/apikey)");
  if (!tgToken || !tgChat) missing.push("Telegram alerts (re-run npm run setup when you have a bot token from @BotFather)");

  console.log("\n✓ Setup complete. Next steps:");
  if (missing.length) {
    console.log("  Still missing (optional, app works without them):");
    for (const m of missing) console.log(`    - ${m}`);
  }
  console.log("  1. npm run pipeline   # first scout → score → alert run");
  console.log("  2. npm run dev        # dashboard at http://localhost:3000");
  console.log("\n  Tip: fine-tune what counts as 'your skills' any time — add keywords");
  console.log("  to USER_KEYWORDS in .env, or edit the lens in src/lib/skills.ts.");
  console.log("");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
