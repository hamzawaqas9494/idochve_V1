import { z } from "zod";

export const reviewSchema = z.object({
  name: z.string().trim().min(2),
  organization: z.string().trim().min(2),
  title: z.string().trim().min(2),
  country: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  useCase: z.string().min(1),
  volume: z.string().min(1),
  languages: z.string().min(1),
  deployment: z.string().min(1),
  internet: z.string().min(1),
  identity: z.string().trim().min(1),
  siem: z.string().trim().min(1),
  timeline: z.string().min(1),
  notes: z.string().trim().optional(),
  consent: z.literal(true),
  companyWebsite: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
