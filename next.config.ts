import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger Cloud Startup ships the standalone build. Make it explicit so
  // we trace and verify locally too.
  output: "standalone",
  // Bot dependencies live inside lib/bot/* and the workers/ folder. Both are
  // loaded at runtime (require / Worker file path) and must NOT be bundled
  // by Next.js — keep them external so node_modules/* is resolved on disk.
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "@hapi/boom",
    "axios",
    "pino",
    "pino-pretty",
    "qrcode",
    "qrcode-terminal",
  ],
  // Hostinger ships the standalone build only, so any file Next.js doesn't
  // trace gets stripped. Force the bot worker, bot source, and the data
  // assets (knowledge base + gambar) into the trace.
  outputFileTracingIncludes: {
    "/**/*": [
      "./workers/**/*",
      "./lib/bot/**/*",
      "./data/knowledge-base.json",
      "./data/data.md",
      "./data/gambar/**/*",
    ],
  },
};

export default nextConfig;
