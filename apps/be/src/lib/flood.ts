import type { DistrictStatus, FloodStatus, StatusSource } from "@repo/db";

// Effective district status priority: MANUAL > GROUND_REPORTS > API_READING,
// else NORMAL. Mirrors the comment on the DistrictStatus model.
const SOURCE_PRIORITY: Record<StatusSource, number> = {
  MANUAL: 3,
  GROUND_REPORTS: 2,
  API_READING: 1,
};

export type EffectiveFloodStatus = {
  status: FloodStatus;
  source: StatusSource | null;
  reason: string | null;
  updatedAt: Date | null;
};

export function effectiveFloodStatus(statuses: DistrictStatus[]): EffectiveFloodStatus {
  if (statuses.length === 0) {
    return { status: "NORMAL", source: null, reason: null, updatedAt: null };
  }
  const best = [...statuses].sort(
    (a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source],
  )[0]!;
  return {
    status: best.status,
    source: best.source,
    reason: best.reason,
    updatedAt: best.updatedAt,
  };
}
