import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type MapView from "@arcgis/core/views/MapView";
import type { AttachmentEdit, EditOptions } from "@arcgis/core/editing/types";
import { enrichTreeAttributesFromMap } from "./treeEnrichmentService";

export type CreateTreeInput = {
  mapView: MapView;
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
  canopyValue: string | number | null;
};

const TREE_LAYER_ID = "9424d21bd45345ffbd5a1736941ed88d";

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

function findTreeLayer(mapView: MapView): FeatureLayer {
  const map = mapView.map;
  if (!map) {
    throw new Error("Map is not ready.");
  }

  const foundLayer = map.allLayers.find((layer) => {
    const typedLayer = layer as { id?: string; portalItem?: { id?: string } };
    return typedLayer.id === TREE_LAYER_ID || typedLayer.portalItem?.id === TREE_LAYER_ID;
  });

  if (!foundLayer) {
    throw new Error(`Tree layer \"${TREE_LAYER_ID}\" was not found in the map.`);
  }

  if (foundLayer.type !== "feature") {
    throw new Error(`Layer \"${TREE_LAYER_ID}\" is not a feature layer.`);
  }

  return foundLayer as FeatureLayer;
}

function setIfFieldExists(
  attributes: Record<string, unknown>,
  layer: FeatureLayer,
  fieldNameCandidates: string[],
  value: unknown,
): void {
  const matchedField = layer.fields.find((field) =>
    fieldNameCandidates.some(
      (candidate) => field.name.toLowerCase() === candidate.toLowerCase(),
    ),
  );
  if (!matchedField) {
    return;
  }

  attributes[matchedField.name] = value;
}

function buildTreeAttributes(
  input: CreateTreeInput,
  featureLayer: FeatureLayer,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  setIfFieldExists(attributes, featureLayer, ["isAlive", "is_alive", "alive"], input.isAlive);

  if (input.imageFile) {
    setIfFieldExists(
      attributes,
      featureLayer,
      ["image", "imageUrl", "imageURL", "image_name", "imageName", "photo", "photoUrl"],
      input.imageFile.name,
    );
  }

  return attributes;
}

function resolveCanopyValue(attributes: Record<string, unknown>): string | number | null {
  const directValue = attributes.Canopy;
  if (typeof directValue === "string" || typeof directValue === "number") {
    return directValue;
  }

  if (directValue === null) {
    return null;
  }

  const canopyKey = Object.keys(attributes).find(
    (key) => key.toLowerCase() === "canopy",
  );
  if (!canopyKey) {
    return null;
  }

  const canopyValue = attributes[canopyKey];
  return typeof canopyValue === "string" || typeof canopyValue === "number"
    ? canopyValue
    : null;
}

function toCreatedTree(
  input: CreateTreeInput,
  id: string | number,
  attributes: Record<string, unknown>,
): CreatedTree {
  return {
    id: String(id),
    latitude: input.latitude,
    longitude: input.longitude,
    isAlive: input.isAlive,
    canopyValue: resolveCanopyValue(attributes),
  };
}

function findFieldNameIgnoreCase(
  layer: FeatureLayer,
  candidates: string[],
): string | null {
  const match = layer.fields.find((field) =>
    candidates.some((candidate) => field.name.toLowerCase() === candidate.toLowerCase()),
  );
  return match?.name ?? null;
}

function coerceIdValue(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

async function resolveTreeGlobalId(
  featureLayer: FeatureLayer,
  addResult: { objectId?: number | null; globalId?: string | null },
): Promise<string | number | null> {
  const globalIdFieldName = findFieldNameIgnoreCase(featureLayer, ["GlobalID", "globalid"]);
  if (!globalIdFieldName) {
    return null;
  }

  const queryFieldName = featureLayer.objectIdField ?? findFieldNameIgnoreCase(featureLayer, ["OBJECTID"]);
  if (!queryFieldName || typeof addResult.objectId !== "number") {
    return null;
  }

  const query = featureLayer.createQuery();
  query.where = `${queryFieldName} = ${addResult.objectId}`;
  query.returnGeometry = false;
  query.outFields = [globalIdFieldName];
  query.num = 1;

  const result = await featureLayer.queryFeatures(query);
  const feature = result.features.at(0);
  if (!feature || !feature.attributes || typeof feature.attributes !== "object") {
    return null;
  }

  const attributes = feature.attributes as Record<string, unknown>;
  return coerceIdValue(attributes[globalIdFieldName]);
}

export async function createTree(input: CreateTreeInput): Promise<CreatedTree> {
  const featureLayer = findTreeLayer(input.mapView);
  await featureLayer.load();

  if (featureLayer.capabilities?.operations?.supportsAdd !== true) {
    throw new Error(`Layer \"${TREE_LAYER_ID}\" does not support add operations.`);
  }

  const [{ default: GraphicClass }, { default: PointClass }] = await Promise.all([
    import("@arcgis/core/Graphic"),
    import("@arcgis/core/geometry/Point"),
  ]);

  const hasAttachment = input.imageFile instanceof File;
  const featureGlobalId = createGlobalId();
  const globalIdFieldName = featureLayer.globalIdField;

  if (hasAttachment && featureLayer.capabilities?.data?.supportsAttachment !== true) {
    throw new Error(`Layer "${TREE_LAYER_ID}" does not support attachments.`);
  }

  if (hasAttachment && featureLayer.capabilities?.editing?.supportsGlobalId !== true) {
    throw new Error(`Layer "${TREE_LAYER_ID}" does not support GlobalID editing required for attachments.`);
  }

  if (hasAttachment && (!globalIdFieldName || globalIdFieldName.trim().length === 0)) {
    throw new Error(`Layer "${TREE_LAYER_ID}" is missing a global ID field required for attachments.`);
  }

  const baseAttributes = buildTreeAttributes(input, featureLayer);
  if (globalIdFieldName && globalIdFieldName.trim().length > 0) {
    baseAttributes[globalIdFieldName] = featureGlobalId;
  }

  const enrichedAttributes = await enrichTreeAttributesFromMap(
    input.mapView,
    input.latitude,
    input.longitude,
    baseAttributes,
  );

  const addFeatureGraphic = new GraphicClass({
    geometry: new PointClass({
      latitude: input.latitude,
      longitude: input.longitude,
      spatialReference: { wkid: 4326 },
    }),
    attributes: enrichedAttributes,
  });

  const edits: {
    addFeatures: InstanceType<typeof GraphicClass>[];
    addAttachments?: AttachmentEdit[];
  } = {
    addFeatures: [addFeatureGraphic],
  };

  if (hasAttachment) {
    const imageFile = input.imageFile;
    if (!imageFile) {
      throw new Error("Tree image file was not available for attachment upload.");
    }
    edits.addAttachments = [
      {
        feature: {
          globalId: featureGlobalId,
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

  const editResult = await featureLayer.applyEdits(edits, editOptions);

  const addResult = editResult.addFeatureResults.at(0);
  if (!addResult) {
    throw new Error("Tree layer did not return an add result.");
  }

  if (addResult.error) {
    throw new Error(`Add tree failed: ${addResult.error.message ?? "Unknown ArcGIS error."}`);
  }

  if (hasAttachment) {
    const attachmentResult = editResult.addAttachmentResults.at(0);
    if (!attachmentResult) {
      throw new Error("Tree was created, but attachment add result was missing.");
    }
    if (attachmentResult.error) {
      throw new Error(
        `Add tree attachment failed: ${attachmentResult.error.message ?? "Unknown ArcGIS error."}`,
      );
    }
  }

  let createdId: string | number | null = null;

  try {
    createdId = await resolveTreeGlobalId(featureLayer, addResult);
  } catch {
    createdId = null;
  }

  if (createdId === null) {
    createdId =
      typeof addResult.globalId === "string" && addResult.globalId.trim().length > 0
        ? addResult.globalId
        : typeof addResult.objectId === "number"
          ? addResult.objectId
          : null;
  }

  if (createdId === null) {
    throw new Error("Tree layer add result did not include an id.");
  }

  return toCreatedTree(input, createdId, enrichedAttributes);
}
