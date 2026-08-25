/**
 * Certification entry — a course completion, badge, or award.
 */
import { z } from "zod";

export const CertificationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  issuer: z.string().min(1, "Issuer is required"),
  date: z.string().nullable().default(null),
  link: z.string().url().nullable().default(null),
});

export type Certification = z.infer<typeof CertificationSchema>;
