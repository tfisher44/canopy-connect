import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type MapView from "@arcgis/core/views/MapView";
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

const TREE_LAYER_ID = "835d492568764e579de4ed33fd8c7549";

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

  const baseAttributes = buildTreeAttributes(input, featureLayer);
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

  const editResult = await featureLayer.applyEdits({
    addFeatures: [addFeatureGraphic],
  });

  const addResult = editResult.addFeatureResults.at(0);
  if (!addResult) {
    throw new Error("Tree layer did not return an add result.");
  }

  if (addResult.error) {
    throw new Error(`Add tree failed: ${addResult.error.message ?? "Unknown ArcGIS error."}`);
  }

  const createdId =
    typeof addResult.objectId === "number"
      ? addResult.objectId
      : typeof addResult.globalId === "string" && addResult.globalId.trim().length > 0
        ? addResult.globalId
        : null;

  if (createdId === null) {
    throw new Error("Tree layer add result did not include an id.");
  }

  return toCreatedTree(input, createdId, enrichedAttributes);
}
