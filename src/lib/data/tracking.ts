import { loadTracking } from "./loader";
import type { TrackingRecord } from "./types";

export async function getTrackingForOrder(
  orderId: number,
): Promise<TrackingRecord[]> {
  const tracking = await loadTracking();
  return tracking.filter((record) => record.order_id === orderId);
}
