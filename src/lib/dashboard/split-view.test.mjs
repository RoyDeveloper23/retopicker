import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DASHBOARD_WIDTH,
  MAX_DASHBOARD_WIDTH,
  MIN_DASHBOARD_WIDTH,
  SPLIT_VIEW_BREAKPOINT,
  isSplitViewAvailable,
  resizeDashboardPane,
} from "./split-view.ts";

test("enables split view only when the viewport can fit both panels", () => {
  assert.equal(isSplitViewAvailable(SPLIT_VIEW_BREAKPOINT - 1), false);
  assert.equal(isSplitViewAvailable(SPLIT_VIEW_BREAKPOINT), true);
  assert.equal(isSplitViewAvailable(Number.NaN), false);
});

test("resizes the dashboard panel within usable bounds", () => {
  assert.equal(
    resizeDashboardPane(DEFAULT_DASHBOARD_WIDTH, 20, 1_000),
    DEFAULT_DASHBOARD_WIDTH + 2,
  );
  assert.equal(resizeDashboardPane(65, 500, 1_000), MAX_DASHBOARD_WIDTH);
  assert.equal(resizeDashboardPane(52, -500, 1_000), MIN_DASHBOARD_WIDTH);
});

test("keeps the current panel width when a drag has no usable container", () => {
  assert.equal(resizeDashboardPane(60, 20, 0), 60);
});
