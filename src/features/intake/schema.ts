import { z } from "zod";
import { imageFileSchema } from "./model/imageValidation";

export const intakeSchema = z.object({
  story: z
    .string({ error: "Story is required." })
    .trim()
    .min(1, "Story is required.")
    .max(5000, "Story must be 5000 characters or less."),
});

export const addTreeSchema = z.object({
  isAlive: z.boolean(),
  imageFile: imageFileSchema,
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;
export type AddTreeFormValues = z.infer<typeof addTreeSchema>;
