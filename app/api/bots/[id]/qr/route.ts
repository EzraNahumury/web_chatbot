import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getBot, isValidBotId } from "@/lib/bot-state";

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
  if (!bot || !bot.qr) {
    return Response.json({ error: "No QR available" }, { status: 404 });
  }
  try {
    const png = await QRCode.toBuffer(bot.qr, { width: 300, margin: 2 });
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "QR generation failed" }, { status: 500 });
  }
}
