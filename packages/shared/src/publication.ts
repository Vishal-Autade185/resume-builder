/**
 * Publication entry — academic or industry publication.
 */
import { z } from "zod";

export const PublicationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  venue: z.string().min(1),
  date: z.string().nullable().default(null),
  authors: z.array(z.string()).default([]),
  link: z.string().url().nullable().default(null),
});

export type Publication = z.infer<typeof PublicationSchema>;
