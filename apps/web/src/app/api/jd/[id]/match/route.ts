/**
 * GET /api/jd/[id]/match - compute the JD match score for a stored jd
 * against the current data bank. Returns overlap %, matched keywords,
 * and missing keywords.
 */
import { NextResponse } from "next/server";
import { computeJdMatchScore, type DataBank } from "@resume-builder/shared";
import { emptyDataBank } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createServiceClient();

  const { data: jdRow, error: jdErr } = await supabase
    .from("job_descriptions")
    .select("raw_text")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (jdErr) {
    return NextResponse.json({ error: jdErr.message }, { status: 500 });
  }
  if (!jdRow) {
    return NextResponse.json({ error: "jd not found" }, { status: 404 });
  }

  const { data: bankRow, error: bankErr } = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (bankErr) {
    return NextResponse.json({ error: bankErr.message }, { status: 500 });
  }
  const { id: _id, user_id: _u, created_at: _ca, updated_at: _ua, ...rest } =
    bankRow ?? {};
  const bank: DataBank = rest ? (rest as DataBank) : emptyDataBank();

  const score = computeJdMatchScore({ jdText: jdRow.raw_text, bank });
  return NextResponse.json({ data: score });
}