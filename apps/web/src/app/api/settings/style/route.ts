/**
 * GET  /api/settings/style - return current style toggles (or defaults).
 * PUT  /api/settings/style - update style toggles.
 *
 * Separate from /api/settings (which holds ai provider/model/fact-grounding).
 * Style toggles are presentation rules; ai settings are how to call the
 * model. Two stores, two routes.
 */
import { NextResponse } from "next/server";
import { ResumeStyleSchema, defaultResumeStyle } from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("resume_style_settings")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ data: defaultResumeStyle() });
  return NextResponse.json({
    data: {
      focusOnCore: data.focus_on_core,
      quantify: data.quantify,
      noOrphans: data.no_orphans,
      ats: data.ats,
    },
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = ResumeStyleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const s = parsed.data;
  const supabase = createServiceClient();
  const { error } = await supabase.from("resume_style_settings").upsert(
    {
      user_id: USER_ID,
      focus_on_core: s.focusOnCore,
      quantify: s.quantify,
      no_orphans: s.noOrphans,
      ats: s.ats,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: s });
}