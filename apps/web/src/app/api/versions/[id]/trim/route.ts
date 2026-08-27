/**
 * POST /api/versions/[id]/trim
 *
 * Takes a version with page_count > 1 (overflow), asks gemini to
 * suggest which items to shorten/remove so it fits in 1 page.
 *
 * Returns ProposedChange[] (same shape as /api/tailor returns).
 * Caller (ui) shows the same diff/accept-reject panel as the AI
 * tailoring flow; user picks which suggestions to apply.
 *
 * Why a separate route from /api/tailor: this is a *trim* pass, not
 * a JD-tailor pass. The prompt tells gemini the goal explicitly
 * ("reduce to 1 page") rather than the broader "match this jd".
 */
import { NextResponse } from "next/server";
import { emptyDataBank, type DataBank } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";
import { callGeminiForTailoring, buildTrimPrompt } from "@/lib/gemini-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createServiceClient();
  const { data: verRow, error: verErr } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (verErr) {
    return NextResponse.json({ error: verErr.message }, { status: 500 });
  }
  if (!verRow) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }
  const bank: DataBank = verRow.data_bank_snapshot ?? emptyDataBank();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const prompt = buildTrimPrompt({ bank });
    const changes = await callGeminiForTailoring({
      jd: {
        id: id,
        rawText: "(this is a trim pass - no jd)",
        source: "text",
        sourceName: null,
        warnings: [],
        createdAt: new Date().toISOString(),
      },
      bank,
      apiKey: geminiKey,
      model: "gemini-2.5-flash",
      prompt,
    });
    return NextResponse.json({ data: { changes } });
  } catch (e) {
    return NextResponse.json(
      { error: "trim pass failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}