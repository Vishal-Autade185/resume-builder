/**
 * Page counter - runs pdf-parse on a compiled pdf and returns the
 * number of pages. Used by the apply + manual save endpoints to set
 * page_count on resume_versions for future overflow enforcement.
 */
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function countPdfPages(buffer: Buffer): Promise<number | null> {
  try {
    const result = await pdfParse(buffer);
    return result.numpages ?? null;
  } catch {
    return null;
  }
}
