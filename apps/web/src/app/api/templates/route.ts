/**
 * POST /api/templates — accepts a multipart .zip upload, stores it in
 * Supabase Storage, registers metadata in the templates table.
 * GET  /api/templates — lists templates for the current user.
 *
 * Phase 0: stores one template. fieldMapId is hardcoded to "phase0-default".
 */
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";
const FIELD_MAP_ID = "phase0-default";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const name = form.get("name");
  const mainFile = form.get("mainFile");

  if (!(file instanceof File) || typeof name !== "string" || typeof mainFile !== "string") {
    return NextResponse.json(
      { error: "expected form fields: file, name, mainFile" },
      { status: 400 },
    );
  }

  // Validate: must be a valid zip with the named main file inside.
  const buf = Buffer.from(await file.arrayBuffer());
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return NextResponse.json({ error: "not a valid .zip" }, { status: 400 });
  }
  if (!zip.file(mainFile)) {
    return NextResponse.json(
      { error: `main file "${mainFile}" not found inside zip` },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const storagePath = `${USER_ID}/${id}.zip`;
  const supabase = createServiceClient();

  const { error: uploadErr } = await supabase.storage
    .from("templates")
    .upload(storagePath, buf, { contentType: "application/zip", upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { error: dbErr } = await supabase.from("templates").insert({
    id,
    user_id: USER_ID,
    name,
    storage_path: storagePath,
    main_file: mainFile,
    field_map_id: FIELD_MAP_ID,
  });

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ id, name, mainFile });
}
