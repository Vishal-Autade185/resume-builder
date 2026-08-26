/**
 * Helper types + serializers for resume_versions rows. Lifted out of the
 * route file because Next.js only allows the standard HTTP method exports
 * in route.ts files.
 */
import type { DataBank } from "@resume-builder/shared";

export type ResumeVersionRow = {
  id: string;
  label: string;
  data_bank_snapshot: DataBank;
  selection: Record<string, unknown>;
  template_id: string | null;
  style_settings: Record<string, unknown>;
  pdf_storage_path: string | null;
  created_at: string;
};

export function serializeVersion(row: ResumeVersionRow) {
  return {
    id: row.id,
    label: row.label,
    dataBankSnapshot: row.data_bank_snapshot,
    selection: row.selection,
    templateId: row.template_id,
    styleSettings: row.style_settings ?? {},
    pdfStoragePath: row.pdf_storage_path,
    createdAt: row.created_at,
  };
}
