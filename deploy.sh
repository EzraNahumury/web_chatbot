#!/usr/bin/env bash
# One-shot deploy for Hostinger VPS — Node side only.
# (SSL + reverse proxy assumed handled by Hostinger panel.)
#
# Usage:
#   bash deploy.sh
#
# Re-running is safe (idempotent).
#
# After this script finishes, configure the Hostinger panel reverse proxy:
#   ayreslab.id            → 127.0.0.1:3000   (Next.js web)
#   chatbot.ayreslab.id    → forward path-based:
#       /chatbot01  → 127.0.0.1:4001
#       /chatbot02  → 127.0.0.1:4002
#       /chatbot03  → 127.0.0.1:4003

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

NODE_MAJOR="${NODE_MAJOR:-20}"

c_blue='\033[1;34m'; c_green='\033[1;32m'; c_yellow='\033[1;33m'; c_red='\033[1;31m'; c_off='\033[0m'
step() { echo -e "\n${c_blue}==> $*${c_off}"; }
ok()   { echo -e "${c_green}✓ $*${c_off}"; }
warn() { echo -e "${c_yellow}! $*${c_off}"; }
die()  { echo -e "${c_red}✗ $*${c_off}"; exit 1; }

[[ $(id -u) -eq 0 ]] && die "Don't run as root. Run as a normal user with sudo access."
sudo -v || die "sudo password required."

# ─── 1. Node + PM2 ───────────────────────────────────────────────────────────
step "1/5  Install Node ${NODE_MAJOR} and PM2"

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm install -g pm2
ok "Node $(node -v), PM2 $(pm2 -v)"

# ─── 2. .env ─────────────────────────────────────────────────────────────────
step "2/5  Configure .env"

write_env_template() {
  cat > .env <<EOF
# Shared bot configuration
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b-cloud
AI_TIMEOUT=25000
MAX_HISTORY=10
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=60000
REPLY_DELAY_MIN=800
REPLY_DELAY_MAX=2000
LOG_LEVEL=info
SESSION_DIR=./auth
LOG_DIR=./logs
WA_WATCHDOG_INTERVAL_MS=60000
WA_WATCHDOG_DISCONNECTED_MS=180000
WA_WATCHDOG_STARTING_MS=120000
WA_WATCHDOG_CONNECTED_STALE_MS=120000

# Per-bot Ollama API keys
CHATBOT01_OLLAMA_KEY=$1
CHATBOT02_OLLAMA_KEY=$2
CHATBOT03_OLLAMA_KEY=$3
EOF
  chmod 600 .env
}

if [[ -f .env ]]; then
  ok ".env already exists"
  echo "Current keys (masked):"
  grep -E "^CHATBOT0[123]_OLLAMA_KEY=" .env | sed -E 's/(=.{6}).*/\1***/'
  read -rp "Edit .env now? [y/N] " ans
  [[ "$ans" =~ ^[Yy] ]] && ${EDITOR:-nano} .env
else
  warn ".env not found — creating now"
  read -rp "OLLAMA_KEY for chatbot01: " k1
  read -rp "OLLAMA_KEY for chatbot02: " k2
  read -rp "OLLAMA_KEY for chatbot03: " k3
  [[ -z "$k1" || -z "$k2" || -z "$k3" ]] && die "All 3 keys required."
  write_env_template "$k1" "$k2" "$k3"
  ok ".env created (chmod 600)"
fi

# ─── 3. Dependencies ─────────────────────────────────────────────────────────
step "3/5  Install npm dependencies"
npm install --no-audit --no-fund
for d in bots/chatbot01 bots/chatbot02 bots/chatbot03; do
  echo "  → $d"
  (cd "$d" && npm install --omit=dev --no-audit --no-fund)
done
ok "Dependencies installed"

# ─── 4. Build Next.js ────────────────────────────────────────────────────────
step "4/5  Build Next.js"
npm run build
ok "Build complete"

# ─── 5. PM2 ──────────────────────────────────────────────────────────────────
step "5/5  Start services with PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
sudo env PATH=$PATH:$(dirname "$(command -v node)") \
  pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash || true
pm2 save
ok "PM2 services running:"
pm2 status

# ─── Done ────────────────────────────────────────────────────────────────────
echo
echo -e "${c_green}=========================================${c_off}"
echo -e "${c_green} DEPLOY DONE${c_off}"
echo -e "${c_green}=========================================${c_off}"
echo "Local ports now serving:"
echo "  127.0.0.1:3000  →  Next.js web"
echo "  127.0.0.1:4001  →  chatbot01  (panel: /chatbot01)"
echo "  127.0.0.1:4002  →  chatbot02  (panel: /chatbot02)"
echo "  127.0.0.1:4003  →  chatbot03  (panel: /chatbot03)"
echo
echo "Next: configure Hostinger reverse proxy (panel) to forward:"
echo "  ayreslab.id              → 127.0.0.1:3000"
echo "  chatbot.ayreslab.id/chatbot01 → 127.0.0.1:4001"
echo "  chatbot.ayreslab.id/chatbot02 → 127.0.0.1:4002"
echo "  chatbot.ayreslab.id/chatbot03 → 127.0.0.1:4003"
echo
echo "Useful commands:"
echo "  pm2 status            # see all 4 services"
echo "  pm2 logs chatbot01    # tail logs"
echo "  pm2 restart all       # restart everything"
echo "  bash deploy.sh        # rerun (safe)"
