import { NextRequest } from "next/server";
import { getBot, isValidBotId } from "@/lib/bot-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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
  return Response.json(
    {
      ...bot.status,
      hasQR: !!bot.qr,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
