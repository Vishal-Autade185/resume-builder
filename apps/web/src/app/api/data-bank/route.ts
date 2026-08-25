/**
 * GET /api/data-bank — returns the single user's data bank.
 * PUT /api/data-bank — auto-save target. Body is the full DataBank JSON.
 *
 * Phase 0: single hardcoded user_id. No auth. Service-role client.
 */
import { NextResponse } from "next/server";
import { DataBankSchema, emptyDataBank } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ data: emptyDataBank() });
  }
  // Strip server-only fields before returning.
  const { id, user_id, created_at, updated_at, ...rest } = data;
  return NextResponse.json({ data: rest });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = DataBankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const bank = parsed.data;
  const { error } = await supabase
    .from("data_bank")
    .upsert(
      {
        user_id: USER_ID,
        personal: bank.personal,
        education: bank.education,
        experience: bank.experience,
        projects: bank.projects,
        skills: bank.skills,
        certifications: bank.certifications,
        publications: bank.publications,
        achievements: bank.achievements,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
