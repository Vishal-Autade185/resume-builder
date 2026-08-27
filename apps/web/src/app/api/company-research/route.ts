/**
 * POST /api/company-research
 *
 * body: { companyName: string, jdId?: string, jdText?: string }
 * returns: CompanyResearch
 *
 * Pipeline:
 *   1. If jdId supplied, fetch the jd's raw_text from supabase.
 *   2. Read TAVILY_API_KEY + GEMINI_API_KEY from env.
 *   3. Run the research orchestrator (tavily multi-search + gemini
 *      summarization).
 *   4. Return structured CompanyResearch with sources.
 *
 * Errors propagate to the client; the ui shows them as a toast.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { researchCompany } from "@/lib/company-research";
import type { CompanyResearch } from "@resume-builder/shared";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const companyName =
    typeof body?.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) {
    return NextResponse.json(
      { error: "companyName is required" },
      { status: 400 },
    );
  }
  const jdId = typeof body?.jdId === "string" ? body.jdId : "";

  // Optional: pull jd text from db if jdId supplied.
  let jdText: string | undefined;
  if (jdId) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("job_descriptions")
      .select("raw_text")
      .eq("id", jdId)
      .eq("user_id", USER_ID)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "jd not found" }, { status: 404 });
    }
    jdText = data.raw_text;
  }
  if (typeof body?.jdText === "string" && body.jdText.trim().length > 0) {
    jdText = body.jdText;
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!tavilyKey) {
    return NextResponse.json(
      { error: "TAVILY_API_KEY not set in apps/web/.env.local" },
      { status: 500 },
    );
  }
  if (!geminiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not set in apps/web/.env.local" },
      { status: 500 },
    );
  }

  try {
    const research: CompanyResearch = await researchCompany({
      companyName,
      jdText,
      tavilyKey,
      geminiKey,
      geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    });
    return NextResponse.json({ data: research });
  } catch (e) {
    return NextResponse.json(
      { error: "research failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}