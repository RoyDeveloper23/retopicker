import { loadAssignmentAttempts } from "./loader";
import type { AssignmentAttempt } from "./types";

export async function getAssignmentAttempts(
  orderId: number,
): Promise<AssignmentAttempt[]> {
  const attempts = await loadAssignmentAttempts();
  return attempts.filter((attempt) => attempt.order_id === orderId);
}
