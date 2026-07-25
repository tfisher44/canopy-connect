import type { ComponentRecord } from "../model/types";
import { StyleCompliantComponentRow } from "./StyleCompliantComponentRow";

type StyleCompliantComponentsListProps = {
  items: ComponentRecord[];
};

export function StyleCompliantComponentsList({ items }: StyleCompliantComponentsListProps) {
  return (
    <ul className="style-compliant-components__list" aria-label="Style-compliant components list">
      {items.map((record) => (
        <StyleCompliantComponentRow key={record.id} componentRecord={record} />
      ))}
    </ul>
  );
}

