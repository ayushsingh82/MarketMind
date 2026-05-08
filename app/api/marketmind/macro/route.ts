import { NextResponse } from "next/server";
import { buildMacroEvents } from "@/lib/mock";
import { getMacroEvents, hasSosoKey } from "@/lib/sosovalue";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  if (hasSosoKey()) {
    try {
      const live = await getMacroEvents();
      return NextResponse.json({
        ok: true,
        data: live.data ?? [],
        source: "SoSoValue/macro-events",
        generatedAt: Date.now(),
      });
    } catch (err) {
      return NextResponse.json({
        ok: true,
        data: buildMacroEvents(),
        source: `SoSoValue/macro-events (fallback: ${(err as Error).message.slice(0, 80)})`,
        generatedAt: Date.now(),
      });
    }
  }
  return NextResponse.json({
    ok: true,
    data: buildMacroEvents(),
    source: "SoSoValue/macro-events (offline preview)",
    generatedAt: Date.now(),
  });
}
