/**
 * GET  /api/jd - list stored job descriptions (lightweight; no full text blob).
 * POST /api/jd - create a job description from one of:
 *   - JSON body { text, sourceName? } - raw pasted text
 *   - multipart form-data with file= and optional name= - parses .pdf or .docx
 *
 * Per product.md section 2.3, all three converge into the same job_description
 * row. We parse server-side so the client never has to ship a binary blob
 * just to get text back.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service";
import { extractTextFromPdf } from "@/lib/parse-pdf";
import { extractTextFromDocx } from "@/lib/parse-docx";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("id, source, source_name, created_at, warnings")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: (data ?? []).map((j) => ({
      id: j.id,
      source: j.source,
      sourceName: j.source_name,
      createdAt: j.created_at,
      warnings: j.warnings ?? [],
    })),
  });
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return createFromJson(req);
  }
  if (contentType.includes("multipart/form-data")) {
    return createFromUpload(req);
  }
  return NextResponse.json(
    { error: "expected application/json or multipart/form-data" },
    { status: 400 },
  );
}

async function createFromJson(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const sourceName = typeof body?.sourceName === "string" ? body.sourceName : null;
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  return storeJD({ rawText: text, source: "text", sourceName, warnings: [] });
}

async function createFromUpload(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const sourceName = typeof form.get("name") === "string" ? (form.get("name") as string) : null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "expected a 'file' form field" }, { status: 400 });
  }
  const filename = sourceName ?? file.name ?? "upload";
  const buf = Buffer.from(await file.arrayBuffer());
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const { text, warnings } = await extractTextFromPdf(buf);
    return storeJD({
      rawText: text,
      source: "pdf",
      sourceName: filename,
      warnings,
    });
  }
  if (lower.endsWith(".docx")) {
    const { text, warnings } = await extractTextFromDocx(buf);
    return storeJD({
      rawText: text,
      source: "docx",
      sourceName: filename,
      warnings,
    });
  }
  return NextResponse.json(
    { error: "unsupported file type. expected .pdf or .docx" },
    { status: 400 },
  );
}

async function storeJD(args: {
  rawText: string;
  source: "text" | "pdf" | "docx";
  sourceName: string | null;
  warnings: string[];
}) {
  if (!args.rawText.trim()) {
    return NextResponse.json(
      { error: "could not extract any text. the file may be empty or a scanned image." },
      { status: 400 },
    );
  }
  const id = randomUUID();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      id,
      user_id: USER_ID,
      raw_text: args.rawText,
      source: args.source,
      source_name: args.sourceName,
      warnings: args.warnings,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    data: {
      id: data.id,
      rawText: data.raw_text,
      source: data.source,
      sourceName: data.source_name,
      warnings: data.warnings ?? [],
      createdAt: data.created_at,
    },
  });
}