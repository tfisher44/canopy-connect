import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type MapView from "@arcgis/core/views/MapView";
import type { AttachmentEdit, EditOptions } from "@arcgis/core/editing/types";

export type CreateStoryInput = {
  mapView: MapView;
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

const STORY_TABLE_ID = "8c367ee0703d4c6abc010df5a69c8aae";
const STORY_SUBMIT_TIMEOUT_MS = 20000;

function asFeatureLayer(layer: unknown): FeatureLayer | null {
  if (!layer || typeof layer !== "object") {
    return null;
  }
  const typedLayer = layer as { type?: string };
  return typedLayer.type === "feature" ? (layer as FeatureLayer) : null;
}

function findStoryTable(mapView: MapView): FeatureLayer {
  const map = mapView.map;
  if (!map) {
    throw new Error("Map is not ready.");
  }

  const mapWithTables = map as unknown as {
    allTables?: { toArray?: () => unknown[] };
    tables?: { toArray?: () => unknown[] };
    allLayers?: { toArray?: () => unknown[] };
  };

  const candidateCollections: unknown[][] = [];
  if (typeof mapWithTables.allTables?.toArray === "function") {
    candidateCollections.push(mapWithTables.allTables.toArray());
  }
  if (typeof mapWithTables.tables?.toArray === "function") {
    candidateCollections.push(mapWithTables.tables.toArray());
  }
  if (typeof mapWithTables.allLayers?.toArray === "function") {
    candidateCollections.push(mapWithTables.allLayers.toArray());
  }

  for (const collection of candidateCollections) {
    const found = collection.find((layer) => {
      if (!layer || typeof layer !== "object") {
        return false;
      }
      const typedLayer = layer as { id?: string; portalItem?: { id?: string } };
      return typedLayer.id === STORY_TABLE_ID || typedLayer.portalItem?.id === STORY_TABLE_ID;
    });
    const featureLayer = asFeatureLayer(found);
    if (featureLayer) {
      return featureLayer;
    }
  }

  throw new Error(`Story table "${STORY_TABLE_ID}" was not found in the map.`);
}

function createGlobalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = char === "x" ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((cause) => {
        window.clearTimeout(timeoutId);
        reject(cause);
      });
  });
}

export async function createStory(input: CreateStoryInput): Promise<CreatedStory> {
  const storyTable = findStoryTable(input.mapView);
  await storyTable.load();

  if (storyTable.capabilities?.operations?.supportsAdd !== true) {
    throw new Error(`Story table "${STORY_TABLE_ID}" does not support add operations.`);
  }

  const { default: GraphicClass } = await import("@arcgis/core/Graphic");

  const selectedFiles = input.imageFiles ?? [];
  if (selectedFiles.length > 1) {
    throw new Error("Only one story image is supported right now.");
  }

  const hasAttachment = selectedFiles.length === 1;
  const storyFeatureGlobalId = createGlobalId();
  const globalIdFieldName = storyTable.globalIdField;

  if (hasAttachment && (!globalIdFieldName || globalIdFieldName.trim().length === 0)) {
    throw new Error("Story table is missing a global ID field required for addAttachments.");
  }

  const storyAttributes: Record<string, unknown> = {
    tree_global_id: input.treeId,
    story_name: input.title,
    story: input.details,
    author_name: input.name ?? "",
    author_email: input.email ?? "",
  };

  if (globalIdFieldName && globalIdFieldName.trim().length > 0) {
    storyAttributes[globalIdFieldName] = storyFeatureGlobalId;
  }

  const addFeature = new GraphicClass({
    attributes: storyAttributes,
  });

  const edits: {
    addFeatures: InstanceType<typeof GraphicClass>[];
    addAttachments?: AttachmentEdit[];
  } = {
    addFeatures: [addFeature],
  };

  if (hasAttachment) {
    const imageFile = selectedFiles[0];
    edits.addAttachments = [
      {
        feature: {
          globalId: storyFeatureGlobalId,
        },
        attachment: {
          globalId: createGlobalId(),
          name: imageFile.name,
          contentType: imageFile.type,
          data: imageFile,
        },
      },
    ];
  }

  const editOptions: EditOptions | undefined = hasAttachment
    ? {
        globalIdUsed: true,
      }
    : undefined;

  const editResult = await withTimeout(
    storyTable.applyEdits(edits, editOptions),
    STORY_SUBMIT_TIMEOUT_MS,
    "Add story timed out while saving to the hosted table. Please try again.",
  );

  const addResult = editResult.addFeatureResults.at(0);
  if (!addResult) {
    throw new Error("Story table did not return an add result.");
  }

  if (addResult.error) {
    throw new Error(`Add story failed: ${addResult.error.message ?? "Unknown ArcGIS error."}`);
  }

  if (hasAttachment) {
    const attachmentResult = editResult.addAttachmentResults.at(0);
    if (!attachmentResult) {
      throw new Error("Story was created, but attachment add result was missing.");
    }
    if (attachmentResult.error) {
      throw new Error(
        `Add story attachment failed: ${attachmentResult.error.message ?? "Unknown ArcGIS error."}`,
      );
    }
  }

  const createdId =
    typeof addResult.globalId === "string" && addResult.globalId.trim().length > 0
      ? addResult.globalId
      : typeof addResult.objectId === "number"
        ? addResult.objectId
        : null;

  if (createdId === null) {
    throw new Error("Story table add result did not include an id.");
  }

  return {
    id: String(createdId),
    treeId: input.treeId,
  };
}
