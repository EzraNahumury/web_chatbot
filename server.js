// Custom Next.js server.
// Spawns 3 bot worker threads on startup and exposes /api/bots/[id]/{status,qr,logout}
// before delegating everything else to Next.js.

const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const next = require("next");
const QRCode = require("qrcode");

// Load .env at the project root manually (custom server, no `next start`).
(function loadDotenv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
})();

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const BOT_IDS = ["chatbot01", "chatbot02", "chatbot03"];
const DATA_DIR = path.join(__dirname, "data");
const SESSIONS_ROOT = path.join(DATA_DIR, "sessions");
const LOGS_ROOT = path.join(DATA_DIR, "logs");

for (const dir of [SESSIONS_ROOT, LOGS_ROOT]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const bots = Object.create(null);

function buildWorkerEnv(id) {
  const upper = id.toUpperCase();
  return {
    BOT_ID: id,
    OLLAMA_KEY: process.env[`${upper}_OLLAMA_KEY`] || "",
    OLLAMA_HOST: process.env.OLLAMA_HOST,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    AI_TIMEOUT: process.env.AI_TIMEOUT,
    MAX_HISTORY: process.env.MAX_HISTORY,
    MAX_CONCURRENT_AI: process.env.MAX_CONCURRENT_AI,
    AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    REPLY_DELAY_MIN: process.env.REPLY_DELAY_MIN,
    REPLY_DELAY_MAX: process.env.REPLY_DELAY_MAX,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_RETENTION_DAYS: process.env.LOG_RETENTION_DAYS,
    SESSION_DIR: path.join(SESSIONS_ROOT, id),
    LOG_DIR: path.join(LOGS_ROOT, id),
    KB_PATH: path.join(DATA_DIR, "knowledge-base.json"),
    GAMBAR_DIR: path.join(DATA_DIR, "gambar"),
    WA_WATCHDOG_INTERVAL_MS: process.env.WA_WATCHDOG_INTERVAL_MS,
    WA_WATCHDOG_DISCONNECTED_MS: process.env.WA_WATCHDOG_DISCONNECTED_MS,
    WA_WATCHDOG_STARTING_MS: process.env.WA_WATCHDOG_STARTING_MS,
    WA_WATCHDOG_CONNECTED_STALE_MS: process.env.WA_WATCHDOG_CONNECTED_STALE_MS,
  };
}

function spawnBot(id) {
  const worker = new Worker(path.join(__dirname, "bot-worker.js"), {
    workerData: { id, env: buildWorkerEnv(id) },
  });

  bots[id] = {
    worker,
    status: { status: "starting", hasQR: false },
    qr: null,
  };

  worker.on("message", (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "status") {
      bots[id].status = msg.value;
    } else if (msg.type === "qr") {
      bots[id].qr = msg.value;
    }
  });

  worker.on("error", (err) => {
    console.error(`[bot:${id}] worker error:`, err);
  });

  worker.on("exit", (code) => {
    console.error(`[bot:${id}] worker exited code=${code}, respawning in 5s`);
    delete bots[id];
    setTimeout(() => spawnBot(id), 5000);
  });

  console.log(`[bot:${id}] worker spawned`);
}

function sendJSON(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function handleBotApi(req, res, id, action) {
  const bot = bots[id];
  if (!bot) return sendJSON(res, 404, { error: "Bot not found" });

  if (action === "status" && req.method === "GET") {
    return sendJSON(res, 200, {
      ...bot.status,
      hasQR: !!bot.qr,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  if (action === "qr" && req.method === "GET") {
    if (!bot.qr) return sendJSON(res, 404, { error: "No QR available" });
    try {
      const png = await QRCode.toBuffer(bot.qr, { width: 300, margin: 2 });
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store");
      return res.end(png);
    } catch (err) {
      return sendJSON(res, 500, { error: "QR generation failed" });
    }
  }

  if (action === "logout" && req.method === "POST") {
    bot.worker.postMessage({ type: "logout" });
    return sendJSON(res, 200, { ok: true, message: "Logout initiated" });
  }

  return sendJSON(res, 405, { error: "Method not allowed" });
}

BOT_IDS.forEach(spawnBot);

app.prepare().then(() => {
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    const m = pathname && pathname.match(/^\/api\/bots\/(chatbot0[123])\/(status|qr|logout)\/?$/);
    if (m) {
      try {
        await handleBotApi(req, res, m[1], m[2]);
      } catch (err) {
        console.error("bot api error:", err);
        sendJSON(res, 500, { error: "Internal error" });
      }
      return;
    }

    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Server ready on http://localhost:${port} (dev=${dev})`);
  });
});
