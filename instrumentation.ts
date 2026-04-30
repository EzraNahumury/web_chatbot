// Next.js boot hook — runs ONCE per Node.js server process at startup.
// Used here to spawn the 3 WhatsApp bot worker_threads.
// Skipped on the Edge runtime (workers there are unsupported).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBots } = await import("./lib/bot-registry");
  startBots();
}
