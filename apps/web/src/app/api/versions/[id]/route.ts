/**
 * GET    /api/versions/[id]  - fetch one version (full data, including
 *                              dataBankSnapshot and selection).
 * DELETE /api/versions/[id]  - delete a version row AND its PDF in storage.
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
    .from("resume_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      id: data.id,
      label: data.label,
      dataBankSnapshot: data.data_bank_snapshot,
      selection: data.selection,
      templateId: data.template_id,
      styleSettings: data.style_settings ?? {},
      pdfStoragePath: data.pdf_storage_path,
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

  // Look up the storage path before deleting the row so we can clean up
  // storage. If the row is already gone this is a no-op.
  const { data: existing } = await supabase
    .from("resume_versions")
    .select("pdf_storage_path")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();

  const { error: delErr } = await supabase
    .from("resume_versions")
    .delete()
    .eq("id", id)
    .eq("user_id", USER_ID);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (existing?.pdf_storage_path) {
    // Best-effort storage cleanup. Failures here are reported but not
    // fatal - the row is already deleted.
    const { error: storageErr } = await supabase.storage
      .from("pdfs")
      .remove([existing.pdf_storage_path]);
    if (storageErr) {
      return NextResponse.json({
        ok: true,
        warning: "row deleted but storage cleanup failed: " + storageErr.message,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
