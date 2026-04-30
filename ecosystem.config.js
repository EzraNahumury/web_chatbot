// PM2 process manager config — run all 4 services on the VPS:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup
//
// Env strategy: a SINGLE .env at the project root is the source of truth.
// We parse it here (no dependency on `dotenv`) and forward the right vars
// to each app.

const fs = require("fs");
const path = require("path");

function loadDotenv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
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
    out[key] = value;
  }
  return out;
}

const ENV = loadDotenv(path.join(__dirname, ".env"));

const sharedBotEnv = {
  NODE_ENV: "production",
  OLLAMA_HOST: ENV.OLLAMA_HOST,
  OLLAMA_MODEL: ENV.OLLAMA_MODEL,
  AI_TIMEOUT: ENV.AI_TIMEOUT,
  MAX_HISTORY: ENV.MAX_HISTORY,
  RATE_LIMIT_MAX: ENV.RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW: ENV.RATE_LIMIT_WINDOW,
  REPLY_DELAY_MIN: ENV.REPLY_DELAY_MIN,
  REPLY_DELAY_MAX: ENV.REPLY_DELAY_MAX,
  LOG_LEVEL: ENV.LOG_LEVEL,
  SESSION_DIR: ENV.SESSION_DIR,
  LOG_DIR: ENV.LOG_DIR,
  WA_WATCHDOG_INTERVAL_MS: ENV.WA_WATCHDOG_INTERVAL_MS,
  WA_WATCHDOG_DISCONNECTED_MS: ENV.WA_WATCHDOG_DISCONNECTED_MS,
  WA_WATCHDOG_STARTING_MS: ENV.WA_WATCHDOG_STARTING_MS,
  WA_WATCHDOG_CONNECTED_STALE_MS: ENV.WA_WATCHDOG_CONNECTED_STALE_MS,
};

module.exports = {
  apps: [
    {
      name: "web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
    {
      name: "chatbot01",
      cwd: path.join(__dirname, "bots/chatbot01"),
      script: "index.js",
      env: {
        ...sharedBotEnv,
        PORT: "4001",
        BASE_PATH: "/chatbot01",
        OLLAMA_KEY: ENV.CHATBOT01_OLLAMA_KEY,
      },
    },
    {
      name: "chatbot02",
      cwd: path.join(__dirname, "bots/chatbot02"),
      script: "index.js",
      env: {
        ...sharedBotEnv,
        PORT: "4002",
        BASE_PATH: "/chatbot02",
        OLLAMA_KEY: ENV.CHATBOT02_OLLAMA_KEY,
      },
    },
    {
      name: "chatbot03",
      cwd: path.join(__dirname, "bots/chatbot03"),
      script: "index.js",
      env: {
        ...sharedBotEnv,
        PORT: "4003",
        BASE_PATH: "/chatbot03",
        OLLAMA_KEY: ENV.CHATBOT03_OLLAMA_KEY,
      },
    },
  ],
};
