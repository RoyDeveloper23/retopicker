export const SPLIT_VIEW_BREAKPOINT = 1_024;
export const DEFAULT_DASHBOARD_WIDTH = 62;
export const MIN_DASHBOARD_WIDTH = 50;
export const MAX_DASHBOARD_WIDTH = 67;

export function isSplitViewAvailable(viewportWidth: number): boolean {
  return Number.isFinite(viewportWidth) && viewportWidth >= SPLIT_VIEW_BREAKPOINT;
}

export function resizeDashboardPane(
  currentWidth: number,
  deltaX: number,
  containerWidth: number,
): number {
  if (
    !Number.isFinite(currentWidth) ||
    !Number.isFinite(deltaX) ||
    !Number.isFinite(containerWidth) ||
    containerWidth <= 0
  ) {
    return currentWidth;
  }

  const nextWidth = currentWidth + (deltaX / containerWidth) * 100;
  return Math.min(MAX_DASHBOARD_WIDTH, Math.max(MIN_DASHBOARD_WIDTH, nextWidth));
}
