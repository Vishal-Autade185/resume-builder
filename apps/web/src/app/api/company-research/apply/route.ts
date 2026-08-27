/**
 * POST /api/company-research/apply
 *
 * body: { companyName, summary }
 * Side effect: updates data_bank.personal.summary so the next
 * version of the resume (manual or template-aware) includes the
 * research-derived text in its \section{SUMMARY} block.
 *
 * Single per-version decision: the user accepts the whole summary
 * (or types their own replacement in the ui before clicking apply).
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const summary =
    typeof body?.summary === "string" ? body.summary.trim() : "";
  if (!summary) {
    return NextResponse.json(
      { error: "summary is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch the current data bank.
  const { data: bankRow, error: bankErr } = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (bankErr) {
    return NextResponse.json({ error: bankErr.message }, { status: 500 });
  }
  if (!bankRow) {
    return NextResponse.json(
      { error: "no data bank yet" },
      { status: 400 },
    );
  }

  // Merge the summary into personal. Preserve all other fields.
  const personal = bankRow.personal ?? {};
  const updated = { ...personal, summary };

  const { error: writeErr } = await supabase
    .from("data_bank")
    .upsert(
      {
        user_id: USER_ID,
        personal: updated,
        education: bankRow.education,
        experience: bankRow.experience,
        projects: bankRow.projects,
        skills: bankRow.skills,
        certifications: bankRow.certifications,
        publications: bankRow.publications,
        achievements: bankRow.achievements,
      },
      { onConflict: "user_id" },
    );
  if (writeErr) {
    return NextResponse.json(
      { error: "failed to save summary: " + writeErr.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ data: { summary: updated.summary } });
}