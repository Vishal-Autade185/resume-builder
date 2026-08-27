/**
 * GET    /api/templates/[id] - return the full template row including
 *                              the raw .tex source.
 * DELETE /api/templates/[id] - delete a template.
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
    .from("resume_templates")
    .select("*")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      id: data.id,
      name: data.name,
      detectedFields: data.detected_fields,
      tex: data.tex_source,
      createdAt: data.created_at,
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("resume_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", USER_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
