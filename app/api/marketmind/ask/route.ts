import { NextRequest, NextResponse } from "next/server";
import { runMarketMindAnalysis } from "@/lib/marketmind";

type AskBody = {
  query?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AskBody;
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
    }

    const analysis = await runMarketMindAnalysis(query);
    return NextResponse.json({ ok: true, query, analysis });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown marketmind error",
      },
      { status: 500 },
    );
  }
}
