// Bot spawn DISABLED — Hostinger Cloud Startup blocks the long-lived
// WebSocket Baileys needs, so workers crash-loop and starve the shared
// resource pool. Bots are now hosted on Railway (or VPS); this gateway
// just renders the menu and links out.
//
// To re-enable in-process bots (e.g. on a VPS), uncomment the body below.

declare const __non_webpack_require__: NodeRequire;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_INPROCESS_BOTS !== "true") {
    console.log(
      "[instrumentation] in-process bots disabled (set ENABLE_INPROCESS_BOTS=true to enable)",
    );
    return;
  }

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
    console.error("[instrumentation] failed to start bots:", err);
  }
}
