// Holds the 3 bot worker_threads as a process-wide singleton, so Next.js
// API routes can read status/QR and forward commands.
//
// Spawned once from instrumentation.ts when the Next.js server boots.

import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";

const BOT_IDS = ["chatbot01", "chatbot02", "chatbot03"] as const;
type BotId = (typeof BOT_IDS)[number];

type BotStatus = {
  status: string;
  connectedAt?: string | null;
  reconnectAttempts?: number;
  lastDisconnectReason?: string | null;
  hasQR?: boolean;
};

type BotEntry = {
  worker: Worker;
  status: BotStatus;
  qr: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __botRegistry: Record<string, BotEntry> | undefined;
}

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SESSIONS_ROOT = path.join(DATA_DIR, "sessions");
const LOGS_ROOT = path.join(DATA_DIR, "logs");

function buildWorkerEnv(id: BotId) {
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

function spawnBot(id: BotId) {
  const reg = globalThis.__botRegistry!;
  const worker = new Worker(
    path.join(PROJECT_ROOT, "workers", "bot-worker.js"),
    { workerData: { id, env: buildWorkerEnv(id) } },
  );

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

export function startBots() {
  if (globalThis.__botRegistry) return;
  globalThis.__botRegistry = {};
  for (const dir of [SESSIONS_ROOT, LOGS_ROOT]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  for (const id of BOT_IDS) spawnBot(id);
}

export function getBot(id: string): BotEntry | undefined {
  return globalThis.__botRegistry?.[id];
}

export function isValidBotId(id: string): id is BotId {
  return (BOT_IDS as readonly string[]).includes(id);
}
