/**
 * Skill entry — a named skill grouped by category.
 */
import { z } from "zod";

export const SkillSchema = z.object({
  id: z.string().uuid(),
  category: z.string().min(1, "Category is required"),
  items: z.array(z.string().min(1)).min(1, "At least one skill is required"),
});

export type Skill = z.infer<typeof SkillSchema>;
