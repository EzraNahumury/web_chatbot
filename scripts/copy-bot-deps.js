#!/usr/bin/env node
// Postbuild step: copy bot runtime dependencies (and their transitive
// dependencies) into the next.js standalone build's node_modules.
//
// Why: workers/ and lib/bot/ live outside the next.js dependency graph,
// so @vercel/nft (next.js's tracer) doesn't see their requires and skips
// the related node_modules entries when assembling .next/standalone.
// Without this script the bot workers crash at runtime with:
//   "Cannot find module '@hapi/boom'" / '@whiskeysockets/baileys' / etc.

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const SRC_NM = path.join(PROJECT_ROOT, "node_modules");
const DST_NM = path.join(PROJECT_ROOT, ".next", "standalone", "node_modules");

if (!fs.existsSync(DST_NM)) {
  console.log("[copy-bot-deps] .next/standalone not present, skipping.");
  process.exit(0);
}

// Top-level packages required by lib/bot/* and workers/*. Their transitive
// deps are walked via each package's own package.json.
const ROOT_DEPS = [
  "@hapi/boom",
  "@whiskeysockets/baileys",
  "qrcode-terminal",
  "pino",
  "pino-pretty",
  "axios",
  "qrcode",
];

const copied = new Set();

function copyPackage(name) {
  if (copied.has(name)) return;
  copied.add(name);

  const src = path.join(SRC_NM, name);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-bot-deps] missing in node_modules: ${name}`);
    return;
  }

  const dest = path.join(DST_NM, name);
  if (fs.existsSync(dest)) {
    // Already present (Next.js tracer copied it). Skip the file copy but still
    // recurse into its deps in case some are missing.
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true, dereference: true });
  }

  // Walk dependencies declared in this package's package.json.
  try {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(src, "package.json"), "utf8"),
    );
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.peerDependencies,
      ...pkgJson.optionalDependencies,
    };
    for (const depName of Object.keys(allDeps)) {
      copyPackage(depName);
    }
  } catch {
    // No package.json or unreadable — skip.
  }
}

for (const dep of ROOT_DEPS) copyPackage(dep);

console.log(
  `[copy-bot-deps] copied ${copied.size} package(s) into .next/standalone/node_modules`,
);
