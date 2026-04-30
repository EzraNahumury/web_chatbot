// Worker-mode bridge.
// Replaces the original Express HTTP panel server. Status/QR updates are
// forwarded to the parent thread (server.js) which exposes the panel via
// Next.js API routes at /api/bots/[id]/...

let _port = null;

let _status = {
  status: "starting",
  connectedAt: null,
  reconnectAttempts: 0,
  lastDisconnectReason: null,
};
let _qr = null;

function setParentPort(port) {
  _port = port;
  postSnapshot();
}

function postSnapshot() {
  if (!_port) return;
  _port.postMessage({
    type: "status",
    value: { ..._status, hasQR: !!_qr },
  });
}

function setStatus(status, data = {}) {
  _status = { ..._status, status, ...data };
  // Surface status changes via console.log so they appear in hostinger logs
  // even when the pino-pretty stream is suppressed.
  const botId = process.env.BOT_ID || "?";
  const reason = data.lastDisconnectReason ? ` reason="${data.lastDisconnectReason}"` : "";
  console.log(`[bot:${botId}] status=${status}${reason}`);
  postSnapshot();
}

function setQR(qrString) {
  _qr = qrString;
  if (_port) {
    _port.postMessage({ type: "qr", value: qrString });
  }
  const botId = process.env.BOT_ID || "?";
  console.log(`[bot:${botId}] qr=${qrString ? "received" : "cleared"}`);
  postSnapshot();
}

function getStatus() {
  return _status;
}

function getQR() {
  return _qr;
}

// No-op kept for backward compatibility with callers that still try to start
// the old Express server.
function startHealthServer() {
  /* HTTP is handled by the parent (server.js) */
}

module.exports = {
  startHealthServer,
  setStatus,
  setQR,
  getStatus,
  getQR,
  setParentPort,
};
