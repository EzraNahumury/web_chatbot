import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
