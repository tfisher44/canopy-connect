import type { ComponentRecord } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function isReviewOverdue(record: ComponentRecord, now: Date = new Date()): boolean {
  const reviewTime = Date.parse(record.lastReviewDate);
  if (Number.isNaN(reviewTime)) {
    return false;
  }

  const elapsedDays = (now.getTime() - reviewTime) / MILLISECONDS_PER_DAY;
  return elapsedDays > record.reviewCadenceDays;
}

