/**
 * GET /api/versions/[id]/pdf - returns the version's PDF bytes from storage.
 *
 * Why this exists: the `pdfs` bucket is private, so the browser can't fetch
 * PDFs directly. We proxy through here instead of signing URLs to keep
 * things simple for a single-user app. If you ever go multi-user, swap
 * this for a signed-URL redirect (same endpoint, just `createSignedUrl`
 * then return NextResponse.redirect).
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

  const { data: row, error: rowErr } = await supabase
    .from("resume_versions")
    .select("pdf_storage_path")
    .eq("id", id)
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row?.pdf_storage_path) {
    return NextResponse.json(
      { error: "no pdf for this version" },
      { status: 404 },
    );
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("pdfs")
    .download(row.pdf_storage_path);

  if (dlErr || !blob) {
    return NextResponse.json(
      { error: dlErr?.message ?? "download failed" },
      { status: 502 },
    );
  }

  const bytes = await blob.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${id}.pdf"`,
    },
  });
}