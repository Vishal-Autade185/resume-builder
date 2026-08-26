// pdf-parse v1 has no .d.ts file. This ambient declaration is just enough
// for our use case: extractTextFromPdf takes a Buffer and returns a
// Promise<{ text: string, ... }>.
// We import from the lib subpath directly (lib/pdf-parse.js) to bypass
// pdf-parse's index.js, which has a debug-mode check that triggers
// `isDebugMode = !module.parent` and tries to read a test pdf at module
// load - that breaks in next.js bundling where module.parent is undefined.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdfParse;
}