import { existsSync, readFileSync } from "node:fs";

/** Load .env safely if it exists (local development) without failing in CI environments. */
function loadEnv(): void {
  if (!existsSync(".env")) return;
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(".env");
      return;
    } catch {
      // Fallback to manual parsing if process.loadEnvFile encounters an issue
    }
  }
  try {
    const content = readFileSync(".env", "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore read errors
  }
}

loadEnv();

function env(key: string, fallback = ""): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

function envInt(key: string, fallback: number): number {
  const n = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key: string, fallback = false): boolean {
  const v = (process.env[key] ?? "").toLowerCase();
  return v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : fallback;
}

export const config = {
  gemini: {
    apiKey: env("GEMINI_API_KEY"),
    // "gemini-flash-latest" is a rolling alias that always points to a live flash model.
    model: env("GEMINI_MODEL", "gemini-flash-latest"),
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  telegram: {
    botToken: env("TELEGRAM_BOT_TOKEN"),
    chatId: env("TELEGRAM_CHAT_ID"),
  },
  reddit: {
    clientId: env("REDDIT_CLIENT_ID"),
    clientSecret: env("REDDIT_CLIENT_SECRET"),
  },
  minOpportunityScore: envInt("MIN_OPPORTUNITY_SCORE", 70),
  scheduler: {
    enabled: envBool("SCHEDULER_ENABLED", false),
    scoutIntervalMinutes: envInt("SCOUT_INTERVAL_MINUTES", 30),
    digestHourUtc: envInt("DIGEST_HOUR_UTC", 16),
  },
  cronSecret: env("CRON_SECRET"),
  profile: {
    name: env("USER_NAME", "there"),
    title: env("USER_TITLE", "Software Developer"),
    bio: env("USER_BIO", "open to remote jobs, freelance projects, internships and hackathons"),
    portfolioUrl: env("USER_PORTFOLIO", ""),
    /** Extra user-defined skill keywords, comma-separated in .env. */
    extraKeywords: env("USER_KEYWORDS")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  },
} as const;

export function hasGemini(): boolean {
  return config.gemini.apiKey.length > 10;
}

export function hasTelegram(): boolean {
  return config.telegram.botToken.length > 10 && config.telegram.chatId.length > 3;
}

export function hasReddit(): boolean {
  return config.reddit.clientId.length > 5 && config.reddit.clientSecret.length > 5;
}
