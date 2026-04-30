import { NextRequest } from "next/server";
import { getBot, isValidBotId } from "@/lib/bot-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidBotId(id)) {
    return Response.json({ error: "Bot not found" }, { status: 404 });
  }
  const bot = getBot(id);
  if (!bot) {
    return Response.json({ error: "Bot not ready" }, { status: 503 });
  }
  bot.worker.postMessage({ type: "logout" });
  return Response.json({ ok: true, message: "Logout initiated" });
}
