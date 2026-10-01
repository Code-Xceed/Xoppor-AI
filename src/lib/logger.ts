/** Minimal leveled logger that works in both Next.js server and CLI contexts. */

type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function stamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(level: Level, scope: string, msg: string, extra?: unknown) {
  if (order[level] < order[minLevel]) return;
  const line = `${stamp()} [${level.toUpperCase()}] (${scope}) ${msg}`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (extra !== undefined) sink(line, extra);
  else sink(line);
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, extra?: unknown) => log("debug", scope, msg, extra),
    info: (msg: string, extra?: unknown) => log("info", scope, msg, extra),
    warn: (msg: string, extra?: unknown) => log("warn", scope, msg, extra),
    error: (msg: string, extra?: unknown) => log("error", scope, msg, extra),
  };
}
