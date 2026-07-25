import { useStory } from "../../intake/model/StoryContext";

export function MapPlaceholder() {
  const { latestStory, submittedAt } = useStory();

  return (
    <section className="panel stack" aria-labelledby="map-title">
      <h2 id="map-title">Map Placeholder</h2>
      <p className="muted">
        ArcGIS editable map will be wired here using your reference repos. This page intentionally
        stays minimal for now.
      </p>
      <div>
        <strong>Latest local story:</strong>{" "}
        {latestStory ? `${latestStory.slice(0, 120)}${latestStory.length > 120 ? "..." : ""}` : "None yet"}
      </div>
      <div>
        <strong>Submitted at:</strong> {submittedAt ?? "N/A"}
      </div>
    </section>
  );
}
