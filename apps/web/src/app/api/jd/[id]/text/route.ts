/**
 * GET /api/jd/[id]/text - return the full jd (metadata + rawText) for one id.
 * Separate from /api/jd (list) and /api/jd POST (create) because the
 * single-jd page wants the full text blob while the list page just wants
 * summaries.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "jd not found" }, { status: 404 });
  }
  return NextResponse.json({
    jd: {
      id: data.id,
      source: data.source,
      sourceName: data.source_name,
      warnings: data.warnings ?? [],
      createdAt: data.created_at,
    },
    rawText: data.raw_text,
  });
}