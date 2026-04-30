// Next.js boot hook — runs ONCE per Node.js server process.
// Loads workers/bot-registry.js via webpack's __non_webpack_require__ which
// passes through unchanged at runtime, so worker_threads never enters the
// Next.js compilation graph.

declare const __non_webpack_require__: NodeRequire;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const req: NodeRequire =
      typeof __non_webpack_require__ !== "undefined"
        ? __non_webpack_require__
        : (require as NodeRequire);
    const path = req("path");
    const target = path.join(process.cwd(), "workers", "bot-registry.js");
    req(target).startBots();
    console.log("[instrumentation] bot workers started");
  } catch (err) {
    // Never let bot startup failure take down the web app.
    console.error("[instrumentation] failed to start bots:", err);
  }
}
