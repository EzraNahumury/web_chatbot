"use client";

import { useEffect, useState } from "react";

type Status = {
  status: string;
  connectedAt?: string | null;
  uptimeSeconds?: number;
  reconnectAttempts?: number;
  lastDisconnectReason?: string | null;
  hasQR?: boolean;
};

const LABELS: Record<string, [string, string]> = {
  connected: ["Terhubung", "badge-connected"],
  waiting_qr: ["Menunggu Scan QR", "badge-waiting"],
  starting: ["Memulai...", "badge-other"],
  reconnecting: ["Menghubungkan ulang...", "badge-other"],
  disconnected: ["Terputus", "badge-other"],
  logged_out: ["Logged Out", "badge-other"],
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function fmtUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}j ${m}m ${sec}d` : `${m}m ${sec}d`;
}

export default function BotPanel({ id, name }: { id: string; name: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [qrTick, setQrTick] = useState(0);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/bots/${id}/status`, { cache: "no-store" });
        const j: Status = await res.json();
        if (!alive) return;
        setData(j);
        if (j.status === "waiting_qr" && j.hasQR) {
          setQrTick(Date.now());
        }
      } catch {
        if (alive) setData({ status: "disconnected" });
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  const status = data?.status || "starting";
  const [label, badgeClass] = LABELS[status] || [status, "badge-other"];

  const doLogout = async () => {
    setLogoutBusy(true);
    try {
      await fetch(`/api/bots/${id}/logout`, { method: "POST" });
    } catch {}
    setTimeout(() => setLogoutBusy(false), 4000);
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center gap-8 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">
        Ayres Apparel — <span className="text-cyan-400">{name}</span>
      </h1>

      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
        <span
          className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
            badgeClass === "badge-connected"
              ? "bg-emerald-950 text-emerald-300"
              : badgeClass === "badge-waiting"
                ? "bg-stone-900 text-amber-300"
                : "bg-indigo-950 text-indigo-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              badgeClass === "badge-connected"
                ? "bg-emerald-400 animate-pulse"
                : badgeClass === "badge-waiting"
                  ? "bg-amber-400"
                  : "bg-indigo-400"
            }`}
          />
          {label}
        </span>

        {!data && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
            <div className="text-sm text-slate-500">Menghubungkan ke server...</div>
          </div>
        )}

        {data && status === "waiting_qr" && data.hasQR && (
          <div>
            <img
              src={`/api/bots/${id}/qr?t=${qrTick}`}
              alt="QR Code WhatsApp"
              className="mx-auto h-64 w-64 rounded-xl border-4 border-slate-700"
            />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Buka WhatsApp → <strong>Perangkat Tertaut</strong>
              <br />→ Tautkan Perangkat → Scan QR di atas
            </p>
          </div>
        )}

        {data && status === "connected" && (
          <div>
            <div className="mb-6 text-sm leading-relaxed text-slate-400">
              Terhubung sejak: <strong className="text-slate-200">{fmtDate(data.connectedAt)}</strong>
              <br />
              Uptime:{" "}
              <strong className="text-slate-200">
                {fmtUptime(data.uptimeSeconds || 0)}
              </strong>
            </div>
            <button
              onClick={doLogout}
              disabled={logoutBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {logoutBusy ? "Logout..." : "⏏ Logout Bot"}
            </button>
          </div>
        )}

        {data && status !== "connected" && status !== "waiting_qr" && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
            <div className="text-sm text-slate-500">Status: {status} — menunggu...</div>
          </div>
        )}
      </div>

      <a href="/" className="text-xs text-slate-500 hover:text-slate-300">
        ← Kembali ke menu
      </a>
    </main>
  );
}
