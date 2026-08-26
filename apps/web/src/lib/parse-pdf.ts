/**
 * PDF text extraction. Wraps pdf-parse with friendlier behaviors:
 *   - returns text + warnings (populated when extraction suggests a scan)
 *   - never throws; failures return empty text + a warning.
 *
 * For scans (image-only PDFs), text extraction will produce very little or
 * nothing. We surface that as a warning so the ui can prompt the user to
 * paste the text instead of silently saving an empty jd.
 *
 * Note: pdf-parse v1 uses pdfjs v1 (CommonJS, no web worker). v2 switched
 * to a web-worker architecture that doesn't bundle cleanly with next.js's
 * server output. We're pinned to v1 for that reason.
 */
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const result = await pdfParse(buffer);
    let text = (result.text ?? "").trim();
    if (text.length < 20) {
      warnings.push(
        "PDF text extraction returned very little content. " +
          "If this is a scanned image, please paste the JD text directly instead.",
      );
    }
    return { text, warnings };
  } catch (err) {
    return {
      text: "",
      warnings: [
        "Failed to parse PDF: " +
          (err instanceof Error ? err.message : String(err)),
      ],
    };
  }
}