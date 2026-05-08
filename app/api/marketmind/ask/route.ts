import { NextRequest, NextResponse } from "next/server";
import { runMarketMindAnalysis } from "@/lib/marketmind";

type AskBody = {
  query?: string;
};

export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AskBody;
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "query is required", generatedAt: Date.now() },
        { status: 400 },
      );
    }

    const { analysis, source } = await runMarketMindAnalysis(query);
    return NextResponse.json({
      ok: true,
      data: { query, analysis },
      source,
      generatedAt: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown marketmind error",
        generatedAt: Date.now(),
      },
      { status: 500 },
    );
  }
}
