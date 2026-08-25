/**
 * Job Description — normalized representation.
 */
import { z } from "zod";

export const JobDescriptionSchema = z.object({
  id: z.string().uuid(),
  rawText: z.string().min(1, "JD text is required"),
  sourceName: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;
