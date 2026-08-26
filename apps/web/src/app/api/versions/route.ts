/**
 * GET  /api/versions  - list all versions for the user (lightweight, no
 *                       embedded dataBankSnapshot blob; we only ship the
 *                       fields the dropdown UI needs).
 * POST /api/versions  - save a new version. Body:
 *                         { label, selection, templateId? }
 *                       The handler snapshots the current data bank server-
 *                       side (no client-supplied snapshot - never trust the
 *                       client for what "the data bank" is).
 *                       Then it compiles the filtered .tex, uploads the
 *                       PDF to the `pdfs` bucket, updates the row with
 *                       pdfStoragePath, returns the full version.
 *                       On any failure after the row is written, we delete
 *                       the row to avoid orphans.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  SelectionSchema,
  type DataBank,
} from "@resume-builder/shared";
import { renderDataBankToLatex } from "@/lib/render-latex";
import { createServiceClient } from "@/lib/supabase-service";
import { serializeVersion } from "@/lib/version-row";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("id, label, template_id, pdf_storage_path, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: (data ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      templateId: v.template_id,
      pdfStoragePath: v.pdf_storage_path,
      createdAt: v.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  const templateId =
    typeof body?.templateId === "string" && body.templateId.length > 0
      ? body.templateId
      : null;

  const selectionParsed = SelectionSchema.safeParse(body?.selection ?? {});
  if (!selectionParsed.success) {
    return NextResponse.json(
      { error: "invalid selection", issues: selectionParsed.error.issues },
      { status: 400 },
    );
  }
  const selection = selectionParsed.data;

  const supabase = createServiceClient();

  // 1. Snapshot current data bank server-side. Don't trust client-supplied data.
  const bankRes = await supabase
    .from("data_bank")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (bankRes.error) {
    return NextResponse.json({ error: bankRes.error.message }, { status: 500 });
  }
  if (!bankRes.data) {
    return NextResponse.json(
      { error: "no data bank yet - fill out the data bank first" },
      { status: 400 },
    );
  }
  const { id: _i, user_id: _u, created_at: _ca, updated_at: _ua, ...bank } = bankRes.data;
  const dataBankSnapshot = bank as unknown as DataBank;

  // 2. Compile the filtered .tex.
  const tex = renderDataBankToLatex(dataBankSnapshot, { selection });
  const compilerUrl =
    process.env.NEXT_PUBLIC_COMPILER_URL ?? "http://localhost:4000";
  let pdfBytes: Buffer;
  try {
    const compileRes = await fetch(`${compilerUrl}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tex, mainFile: "main.tex" }),
    });
    if (!compileRes.ok) {
      const errText = await compileRes.text();
      return NextResponse.json(
        { error: "compile failed", details: errText },
        { status: 502 },
      );
    }
    const compileBody = (await compileRes.json()) as { pdf: string };
    pdfBytes = Buffer.from(compileBody.pdf, "base64");
  } catch (e) {
    return NextResponse.json(
      { error: "compile call failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }

  // 3. Write the row (no pdfStoragePath yet).
  const id = randomUUID();
  const { data: inserted, error: insertErr } = await supabase
    .from("resume_versions")
    .insert({
      id,
      user_id: USER_ID,
      label,
      data_bank_snapshot: dataBankSnapshot,
      selection,
      template_id: templateId,
      style_settings: {},
      pdf_storage_path: null,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message ?? "failed to insert version" },
      { status: 500 },
    );
  }

  // 4. Upload PDF to storage. If this fails, delete the row to avoid orphans.
  const storagePath = `${USER_ID}/${id}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("pdfs")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    await supabase.from("resume_versions").delete().eq("id", id);
    return NextResponse.json(
      { error: "storage upload failed: " + uploadErr.message },
      { status: 502 },
    );
  }

  // 5. Update the row with the storage path.
  const { data: updated, error: updateErr } = await supabase
    .from("resume_versions")
    .update({ pdf_storage_path: storagePath })
    .eq("id", id)
    .select()
    .single();

  if (updateErr || !updated) {
    // Storage uploaded but row update failed. Clean up storage.
    await supabase.storage.from("pdfs").remove([storagePath]);
    await supabase.from("resume_versions").delete().eq("id", id);
    return NextResponse.json(
      { error: updateErr?.message ?? "failed to finalize version" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: serializeVersion(updated) });
}


