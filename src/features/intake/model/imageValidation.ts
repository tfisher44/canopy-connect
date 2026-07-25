import { z } from "zod";

export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const imageFileSchema = z
  .instanceof(File, { error: "Image is required." })
  .refine((file) => ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number]), {
    error: "Image must be JPG, PNG, or WEBP.",
  })
  .refine((file) => file.size <= IMAGE_MAX_SIZE_BYTES, {
    error: "Image must be 10MB or smaller.",
  });
