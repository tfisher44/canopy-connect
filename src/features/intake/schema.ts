import { z } from "zod";

export const intakeSchema = z.object({
  story: z
    .string({ error: "Story is required." })
    .trim()
    .min(1, "Story is required.")
    .max(5000, "Story must be 5000 characters or less."),
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;
