/**
 * Data Bank — full career record. Serialized to Supabase and read by the
 * structured-field renderer.
 */
import { z } from "zod";
import { PersonalInfoSchema } from "./personal";
import { EducationSchema } from "./education";
import { ExperienceSchema } from "./experience";
import { ProjectSchema } from "./project";
import { SkillSchema } from "./skill";
import { CertificationSchema } from "./certification";
import { PublicationSchema } from "./publication";
import { AchievementSchema } from "./achievement";

export const DataBankSchema = z.object({
  personal: PersonalInfoSchema,
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  publications: z.array(PublicationSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
});

export type DataBank = z.infer<typeof DataBankSchema>;

export const emptyDataBank = (): DataBank => ({
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: null,
    links: [],
    summary: "",
  },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  publications: [],
  achievements: [],
});
