import { z } from "zod";

export type CreateStoryInput = {
  treeId: string;
  title: string;
  details: string;
  name?: string;
  email?: string;
  imageFiles?: File[];
};

export type CreatedStory = {
  id: string;
  treeId: string;
};

const createStoryResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  treeId: z.union([z.string(), z.number()]).optional(),
});

function getApiBaseUrl(): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env.VITE_CANOPY_API_BASE_URL;
  if (typeof value === "string") {
    return value.trim().replace(/\/$/, "");
  }
  return "";
}

export async function createStory(input: CreateStoryInput): Promise<CreatedStory> {
  const endpoint = `${getApiBaseUrl()}/api/stories`;
  const formData = new FormData();
  formData.set("treeId", input.treeId);
  formData.set("title", input.title);
  formData.set("details", input.details);
  if (input.name) {
    formData.set("name", input.name);
  }
  if (input.email) {
    formData.set("email", input.email);
  }
  for (const imageFile of input.imageFiles ?? []) {
    formData.append("images", imageFile);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const detail = errorBody.trim().length > 0 ? ` ${errorBody}` : "";
    throw new Error(`Add story failed (${response.status}).${detail}`);
  }

  const rawData: unknown = await response.json();
  const parsed = createStoryResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error("Add story failed: invalid server response.");
  }

  return {
    id: String(parsed.data.id),
    treeId: String(parsed.data.treeId ?? input.treeId),
  };
}
