/**
 * Template metadata — what we know about an uploaded LaTeX template .zip.
 */
import { z } from "zod";

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  storagePath: z.string().min(1),
  mainFile: z.string().min(1),
  fieldMapId: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type Template = z.infer<typeof TemplateSchema>;
