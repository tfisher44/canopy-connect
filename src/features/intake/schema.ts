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
  imageFile: imageFileSchema.optional(),
});

export const addStorySchema = z.object({
  title: z
    .string({ error: "Story title is required." })
    .trim()
    .min(1, "Story title is required.")
    .max(120, "Story title must be 120 characters or less."),
  details: z
    .string({ error: "Story details are required." })
    .trim()
    .min(1, "Story details are required.")
    .max(2000, "Story details must be 2000 characters or less."),
  imageFiles: z.array(imageFileSchema).max(5, "You can upload up to 5 images.").optional(),
  name: z
    .string()
    .trim()
    .max(120, "Name must be 120 characters or less.")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email must be 254 characters or less.")
    .optional()
    .or(z.literal("")),
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;
export type AddTreeFormValues = z.infer<typeof addTreeSchema>;
export type AddStoryFormValues = z.infer<typeof addStorySchema>;
