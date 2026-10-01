/** Next.js instrumentation hook — runs once when the server boots. */

export async function register() {
  // Guard: only boot the scheduler in the real server runtime (not during build).
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Guard: only run in nodejs runtime, not edge
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
