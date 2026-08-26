/**
 * DOCX text extraction. Wraps mammoth.extractRawText, returns the .docx's
 * body text + any warnings.
 *
 * DOCX is a zip of xml files; mammoth handles that. It only emits a single
 * text string (no formatting) which is exactly what we want for jd parsing.
 */
import mammoth from "mammoth";

export async function extractTextFromDocx(
  buffer: Buffer,
): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const result = await mammoth.extractRawText({ buffer });
    let text = (result.value ?? "").trim();
    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        // mammoth emits warning/info messages about styles it couldn't parse.
        // We surface a summary so the user knows if the docx was unusual.
        warnings.push(`[${msg.type}] ${msg.message}`);
      }
    }
    if (text.length < 20) {
      warnings.push(
        "DOCX text extraction returned very little content. " +
          "The file may contain only images or unusual formatting.",
      );
    }
    return { text, warnings };
  } catch (err) {
    return {
      text: "",
      warnings: [
        "Failed to parse DOCX: " +
          (err instanceof Error ? err.message : String(err)),
      ],
    };
  }
}