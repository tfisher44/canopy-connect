import { isReviewOverdue } from "../model/compliance";
import type { ComponentRecord } from "../model/types";

type StyleCompliantComponentRowProps = {
  componentRecord: ComponentRecord;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StyleCompliantComponentRow({ componentRecord }: StyleCompliantComponentRowProps) {
  const overdue = isReviewOverdue(componentRecord);

  return (
    <li className="style-compliant-components__row glass-panel style-compliant-components__row--matte">
      <h3>{componentRecord.name}</h3>
      <p className="muted">{componentRecord.intendedUse}</p>
      <dl className="style-compliant-components__metadata">
        <div>
          <dt>Status</dt>
          <dd>{componentRecord.complianceStatus}</dd>
        </div>
        <div>
          <dt>Last review</dt>
          <dd>{formatDate(componentRecord.lastReviewDate)}</dd>
        </div>
      </dl>
      {overdue ? (
        <p className="style-compliant-components__overdue-badge" role="status">
          Review overdue
        </p>
      ) : null}
    </li>
  );
}
