/**
 * POST /api/compile — proxy to the compile service. Body is the .tex source
 * (and optional assets). Returns { pdf: base64, log }.
 *
 * Keeps the compiler URL server-only: the browser never talks to the
 * compiler directly, only through this route. Compiler can move / scale
 * independently later.
 */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const compilerUrl = process.env.NEXT_PUBLIC_COMPILER_URL ?? "http://localhost:4000";

  const res = await fetch(`${compilerUrl}/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: "compile service failed", details: text },
      { status: res.status },
    );
  }
  return NextResponse.json(JSON.parse(text));
}
