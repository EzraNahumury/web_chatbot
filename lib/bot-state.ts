// Lightweight glue for Next.js (TS) consumers — API routes — to read the
// bot registry without pulling in worker_threads.
// The actual worker spawning lives in workers/bot-registry.js (CJS), which
// is loaded at runtime from instrumentation.ts via createRequire.

type BotStatus = {
  status: string;
  connectedAt?: string | null;
  reconnectAttempts?: number;
  lastDisconnectReason?: string | null;
  hasQR?: boolean;
};

export type BotEntry = {
  worker: { postMessage(msg: unknown): void };
  status: BotStatus;
  qr: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __botRegistry: Record<string, BotEntry> | undefined;
}

const BOT_IDS = ["chatbot01", "chatbot02", "chatbot03"] as const;

export function getBot(id: string): BotEntry | undefined {
  return globalThis.__botRegistry?.[id];
}

export function isValidBotId(id: string): boolean {
  return (BOT_IDS as readonly string[]).includes(id);
}
