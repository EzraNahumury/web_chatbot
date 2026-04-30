// Bot worker thread.
// Runs one Baileys bot instance in isolation. Started by server.js.

const { workerData, parentPort } = require("node:worker_threads");

// Apply per-bot env BEFORE requiring bot modules (they read env at load time).
const env = workerData.env || {};
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined && value !== null && value !== "") {
    process.env[key] = String(value);
  }
}

// Wire the worker bridge so setStatus / setQR forward to the parent.
const healthcheck = require("./lib/bot/core/healthcheck");
healthcheck.setParentPort(parentPort);

const {
  startConnection,
  startConnectionWatchdog,
  requestReconnect,
  logoutBot,
} = require("./lib/bot/core/connection");

const { logger } = require("./lib/bot/utils/logger");

logger.info(
  { botId: workerData.id, model: process.env.OLLAMA_MODEL },
  "Bot worker starting"
);

startConnectionWatchdog();
startConnection().catch((err) => {
  logger.error({ err: err.message }, "Bot worker startup failed");
  setTimeout(() => requestReconnect("startup failure"), 3000);
});

// Parent → worker commands.
parentPort.on("message", async (msg) => {
  if (!msg || typeof msg !== "object") return;
  try {
    if (msg.type === "logout") {
      await logoutBot();
    } else if (msg.type === "reconnect") {
      requestReconnect("manual reconnect from parent");
    }
  } catch (err) {
    logger.error({ err: err.message, msg }, "Worker command failed");
  }
});

process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "Uncaught exception");
  requestReconnect("uncaught exception");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  requestReconnect("unhandled rejection");
});
