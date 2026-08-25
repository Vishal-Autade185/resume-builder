/**
 * Project entry — a side or academic project.
 * Per product.md §2.1 required: name, timeline, description, tech stack,
 * quantified impact, link. We split timeline into startDate/endDate for
 * consistency with education/experience.
 */
import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  techStack: z.array(z.string()).default([]),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  link: z.string().url().nullable().default(null),
  // Free-form metric claim, e.g. "cut duplicates by 40%". Nullable because
  // not every project has a clean metric. Phase 2's fact-grounding validator
  // will check this against the source description before AI ever touches it.
  impact: z.string().nullable().default(null),
});

export type Project = z.infer<typeof ProjectSchema>;