/**
 * Achievement entry — awards, scholarships, recognitions.
 */
import { z } from "zod";

export const AchievementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  date: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

export type Achievement = z.infer<typeof AchievementSchema>;
