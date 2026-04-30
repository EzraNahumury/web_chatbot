// Spawns the 3 bot worker_threads on Next.js boot.
// Loaded at runtime by instrumentation.ts via createRequire so Next.js's
// bundler never sees the worker_threads import.

const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");

const BOT_IDS = ["chatbot01", "chatbot02", "chatbot03"];
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SESSIONS_ROOT = path.join(DATA_DIR, "sessions");
const LOGS_ROOT = path.join(DATA_DIR, "logs");

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
  const reg = globalThis.__botRegistry;
  const worker = new Worker(path.join(PROJECT_ROOT, "workers", "bot-worker.js"), {
    workerData: { id, env: buildWorkerEnv(id) },
  });

  reg[id] = {
    worker,
    status: { status: "starting", hasQR: false },
    qr: null,
  };

  worker.on("message", (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "status") reg[id].status = msg.value;
    else if (msg.type === "qr") reg[id].qr = msg.value;
  });

  worker.on("error", (err) => {
    console.error(`[bot:${id}] worker error:`, err);
  });

  worker.on("exit", (code) => {
    console.error(`[bot:${id}] worker exited code=${code}, respawning in 5s`);
    delete reg[id];
    setTimeout(() => spawnBot(id), 5000);
  });

  console.log(`[bot:${id}] worker spawned`);
}

function startBots() {
  if (globalThis.__botRegistry) return;
  console.log(
    `[bot-registry] cwd=${PROJECT_ROOT} dataDir=${DATA_DIR} node=${process.version}`,
  );
  globalThis.__botRegistry = {};
  for (const dir of [SESSIONS_ROOT, LOGS_ROOT]) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error(`[bot-registry] mkdir failed for ${dir}:`, err);
    }
  }
  for (const id of BOT_IDS) {
    try {
      spawnBot(id);
    } catch (err) {
      console.error(`[bot-registry] spawnBot(${id}) failed:`, err);
    }
  }
}

module.exports = { startBots };
