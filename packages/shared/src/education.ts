/**
 * Education entry — a degree program, with required institution/degree/dates
 * and optional gpa/details per product.md §2.1.
 */
import { z } from "zod";

export const EducationSchema = z.object({
  id: z.string().uuid(),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"), // "Present" allowed
  gpa: z.string().nullable().default(null),
  details: z.string().nullable().default(null),
});

export type Education = z.infer<typeof EducationSchema>;