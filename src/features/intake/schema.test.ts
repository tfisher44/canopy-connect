import { describe, expect, it } from "vitest";
import { addStorySchema, addTreeSchema } from "./schema";

describe("addTreeSchema", () => {
  it("accepts payload without tree image", () => {
    const result = addTreeSchema.safeParse({
      isAlive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported tree image types", () => {
    const result = addTreeSchema.safeParse({
      isAlive: true,
      imageFile: new File(["content"], "tree.gif", { type: "image/gif" }),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.imageFile).toContain(
        "Image must be JPG, PNG, or WEBP.",
      );
    }
  });
});

describe("addStorySchema", () => {
  it("accepts valid story payload with optional contact fields omitted", () => {
    const result = addStorySchema.safeParse({
      title: "Oak memories",
      details: "This tree has shaded our block for decades.",
      imageFiles: [new File(["image"], "tree.png", { type: "image/png" })],
      name: "",
      email: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects story details longer than 2000 characters", () => {
    const result = addStorySchema.safeParse({
      title: "Too long",
      details: "x".repeat(2001),
      imageFiles: [],
      name: "",
      email: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.details).toContain(
        "Story details must be 2000 characters or less.",
      );
    }
  });

  it("rejects invalid optional email when provided", () => {
    const result = addStorySchema.safeParse({
      title: "Email check",
      details: "Details are valid.",
      imageFiles: [],
      name: "Alex",
      email: "invalid-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain("Enter a valid email address.");
    }
  });
});
