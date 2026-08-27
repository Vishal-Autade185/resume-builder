/**
 * GET  /api/templates - list stored templates.
 * POST /api/templates - upload a new template (.zip containing main.tex).
 *
 * Upload expects a multipart form with:
 *   - file: a .zip file. The first .tex file inside is extracted.
 *   - name (optional): a human-friendly label. Defaults to the zip
 *     filename minus extension.
 *
 * The server extracts the .tex, runs the auto-detect parser, and
 * stores both the raw .tex and the detection result in the row. The
 * /api/templates/[id] endpoint returns the raw .tex when needed
 * (e.g. for rendering into a version).
 */
import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service";
import { detectTemplateFields, findPdftexOnlyMacros, looksLikeLatex } from "@/lib/template-parser";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("resume_templates")
    .select("id, name, detected_fields, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      detectedFields: t.detected_fields,
      createdAt: t.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "expected multipart/form-data with a 'file' field" },
      { status: 400 },
    );
  }
  const file = form.get("file");
  const nameField = form.get("name");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing 'file' field" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json(
      { error: "only .zip uploads supported (must contain main.tex inside)" },
      { status: 400 },
    );
  }

  // Extract the first .tex file from the zip.
  let tex: string;
  try {
    const zip = new AdmZip(buf);
    const texEntry = zip
      .getEntries()
      .find((e) => e.entryName.toLowerCase().endsWith(".tex"));
    if (!texEntry) {
      return NextResponse.json(
        { error: "zip does not contain a .tex file" },
        { status: 400 },
      );
    }
    tex = texEntry.getData().toString("utf8");
  } catch (e) {
    return NextResponse.json(
      { error: "failed to extract zip: " + (e instanceof Error ? e.message : String(e)) },
      { status: 400 },
    );
  }

  if (!looksLikeLatex(tex)) {
    return NextResponse.json(
      {
        error:
          "extracted .tex doesn't look like a latex file (missing \\documentclass or \\begin{document})",
      },
      { status: 400 },
    );
  }

  const detected = detectTemplateFields(tex);
  const pdftexMacros = findPdftexOnlyMacros(tex);
  const name =
    typeof nameField === "string" && nameField.trim().length > 0
      ? nameField.trim()
      : file.name.replace(/\.zip$/i, "");

  const id = randomUUID();
  const supabase = createServiceClient();
  const { error: insertErr } = await supabase.from("resume_templates").insert({
    id,
    user_id: USER_ID,
    name,
    tex_source: tex,
    detected_fields: {
      ...detected,
      pdftexOnlyMacros: pdftexMacros,
    },
    storage_path: null,
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({
    data: {
      id,
      name,
      detectedFields: {
        ...detected,
        pdftexOnlyMacros: pdftexMacros,
      },
      createdAt: new Date().toISOString(),
    },
  });
}
