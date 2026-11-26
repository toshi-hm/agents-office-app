import { describe, expect, test } from 'bun:test';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  CAMERA_AZIMUTH,
  CAMERA_AZIMUTH_MAX,
  CAMERA_AZIMUTH_MIN,
  CAMERA_FOV,
  CAMERA_POLAR,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  cameraBasis,
  dampingAlpha,
  fitView,
  getFocusView,
  getFramingPoints,
  getMaxDistance,
  getOverviewView,
  isSettled,
  lerpPosition,
  positionAtSpherical,
  translateCameraTarget,
} from './camera-math.ts';
import { buildOfficeLayout } from './layout.ts';
import { ROSTER, TEAMS } from './test-fixtures.ts';
import type { ScenePosition } from './types.ts';

const layout = buildOfficeLayout(ROSTER, TEAMS);

/** Projects with the real three.js camera so the hand-written fit is checked independently. */
function projectedExtent(
  view: { position: ScenePosition; target: ScenePosition },
  aspect: number,
  points: readonly ScenePosition[],
) {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 1000);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  camera.updateMatrixWorld(true);
  const projected = points.map((p) => new Vector3(...p).project(camera));
  return {
    x: Math.max(...projected.map((p) => Math.abs(p.x))),
    y: Math.max(...projected.map((p) => Math.abs(p.y))),
  };
}

describe('overview framing', () => {
  for (const aspect of [0.6, 1, 420 / 320, 16 / 9, 2.8]) {
    test(`fits the whole office tightly at aspect ${aspect.toFixed(2)}`, () => {
      const view = getOverviewView(layout, aspect);
      const extent = projectedExtent(view, aspect, getFramingPoints(layout));
      expect(extent.x).toBeLessThanOrEqual(1);
      expect(extent.y).toBeLessThanOrEqual(1);
      // Tight: one axis nearly touches the edge.
      expect(Math.max(extent.x, extent.y)).toBeGreaterThan(0.85);
    });
  }

  test('frames the compact office closer than the full office', () => {
    expect(getOverviewView(layout, 1.3, true).distance).toBeLessThan(
      getOverviewView(layout, 1.3, false).distance,
    );
  });

  test('tolerates an unusable aspect ratio', () => {
    for (const aspect of [0, -1, Number.NaN, Infinity]) {
      const view = getOverviewView(layout, aspect);
      expect(view.position.every(Number.isFinite)).toBe(true);
    }
  });

  test('handles an empty point list', () => {
    expect(fitView([], 1).position.every(Number.isFinite)).toBe(true);
  });

  test('keeps the overview within the zoom limit', () => {
    expect(getMaxDistance(layout, 1)).toBeGreaterThan(getOverviewView(layout, 1).distance);
  });

  test('default viewing angle respects the orbit limits', () => {
    expect(CAMERA_AZIMUTH).toBeGreaterThan(CAMERA_AZIMUTH_MIN);
    expect(CAMERA_AZIMUTH).toBeLessThan(CAMERA_AZIMUTH_MAX);
    expect(CAMERA_POLAR).toBeGreaterThan(CAMERA_POLAR_MIN);
    expect(CAMERA_POLAR).toBeLessThan(CAMERA_POLAR_MAX);
  });
});

describe('focus and follow', () => {
  test('looks at the upper body from the computed distance', () => {
    const view = getFocusView([1, 0, 2], 1.5);
    expect(view.target).toEqual([1, 0.85, 2]);
    const length = Math.hypot(...view.position.map((v, i) => v - view.target[i]!));
    expect(length).toBeCloseTo(view.distance, 6);
    expect(view.distance).toBeLessThan(getOverviewView(layout, 1.5).distance);
  });

  test('backs off in portrait viewports', () => {
    expect(getFocusView([0, 0, 0], 0.7).distance).toBeGreaterThan(
      getFocusView([0, 0, 0], 1.4).distance,
    );
  });

  test('translation preserves the camera offset', () => {
    expect(translateCameraTarget([5, 6, 7], [1, 1, 1], [2, 0, 4])).toEqual([6, 5, 10]);
  });
});

describe('vector helpers', () => {
  test('spherical position and basis agree', () => {
    const { back, right, up } = cameraBasis(0.9, 0.5);
    const position = positionAtSpherical([0, 0, 0], 2, 0.9, 0.5);
    back.forEach((value, i) => expect(position[i]).toBeCloseTo(value * 2, 9));
    const dot = (a: ScenePosition, b: ScenePosition) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(back, right)).toBeCloseTo(0, 9);
    expect(dot(back, up)).toBeCloseTo(0, 9);
    expect(dot(right, up)).toBeCloseTo(0, 9);
  });

  test('damping is frame-rate independent', () => {
    const once = dampingAlpha(0.1);
    const half = dampingAlpha(0.05);
    expect(1 - (1 - half) ** 2).toBeCloseTo(once, 9);
    expect(dampingAlpha(0)).toBe(0);
    expect(dampingAlpha(-1)).toBe(0);
  });

  test('lerp and settle', () => {
    expect(lerpPosition([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3]);
    expect(isSettled([0, 0, 0], [0.001, 0, 0])).toBe(true);
    expect(isSettled([0, 0, 0], [0.1, 0, 0])).toBe(false);
  });
});
