export type CreateTreeInput = {
  latitude: number;
  longitude: number;
  isAlive: boolean;
  imageFile?: File;
};

export type CreatedTree = {
  id: string;
  latitude: number;
  longitude: number;
  isAlive: boolean;
};

type CreateTreeResponse = {
  id: string | number;
  latitude: number;
  longitude: number;
  isAlive: boolean;
};

function getApiBaseUrl(): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env.VITE_CANOPY_API_BASE_URL;
  if (typeof value === "string") {
    return value.trim().replace(/\/$/, "");
  }
  return "";
}

function toCreatedTree(payload: CreateTreeResponse): CreatedTree {
  return {
    id: String(payload.id),
    latitude: payload.latitude,
    longitude: payload.longitude,
    isAlive: payload.isAlive,
  };
}

export async function createTree(input: CreateTreeInput): Promise<CreatedTree> {
  const endpoint = `${getApiBaseUrl()}/api/trees`;
  const formData = new FormData();
  formData.set("latitude", String(input.latitude));
  formData.set("longitude", String(input.longitude));
  formData.set("isAlive", String(input.isAlive));
  if (input.imageFile) {
    formData.set("image", input.imageFile);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const detail = errorBody.trim().length > 0 ? ` ${errorBody}` : "";
    throw new Error(`Add tree failed (${response.status}).${detail}`);
  }

  const responseData = (await response.json()) as CreateTreeResponse;
  return toCreatedTree(responseData);
}
