import { describe, expect, it } from 'vitest';
import { cruiseProgress, Route } from './route';

describe('Route', () => {
  it('whenDrivingAlongLine_thenPositionMovesInHeadingDirection', () => {
    const route = new Route({ x: 1, z: 2, heading: 0 }).line(10);

    const pose = route.at(4);

    expect(pose.x).toBeCloseTo(5);
    expect(pose.z).toBeCloseTo(2);
  });

  it('whenTurningRightOutOfGarage_thenEndsInLaneHeadingPlusX', () => {
    const route = new Route({ x: -63, z: 14, heading: -Math.PI / 2 }).line(5.5).arc(4, Math.PI / 2);

    const pose = route.at(route.length);

    expect(pose.x).toBeCloseTo(-59);
    expect(pose.z).toBeCloseTo(4.5);
    expect(pose.heading).toBeCloseTo(0);
    expect(route.length).toBeCloseTo(5.5 + 2 * Math.PI);
  });

  it('whenTurningLeft_thenCurvesTheOtherWay', () => {
    const route = new Route({ x: 0, z: 0, heading: 0 }).arc(2, -Math.PI / 2);

    const pose = route.at(route.length);

    expect(pose.x).toBeCloseTo(2);
    expect(pose.z).toBeCloseTo(-2);
    expect(pose.heading).toBeCloseTo(-Math.PI / 2);
  });

  it('whenDistanceOutsideRoute_thenClampedToEnds', () => {
    const route = new Route({ x: 0, z: 0, heading: 0 }).line(3);

    expect(route.at(-5).x).toBeCloseTo(0);
    expect(route.at(50).x).toBeCloseTo(3);
  });
});

describe('cruiseProgress', () => {
  it('whenAtBounds_thenStartsAtZeroAndEndsAtOne', () => {
    expect(cruiseProgress(0, 10, 2, 3)).toBeCloseTo(0);
    expect(cruiseProgress(10, 10, 2, 3)).toBeCloseTo(1);
    expect(cruiseProgress(12, 10, 2, 3)).toBeCloseTo(1);
  });

  it('whenCruising_thenProgressGrowsLinearly', () => {
    const first = cruiseProgress(4, 10, 2, 3);
    const second = cruiseProgress(5, 10, 2, 3);
    const third = cruiseProgress(6, 10, 2, 3);

    expect(second - first).toBeCloseTo(third - second);
  });

  it('whenRampsMeetCruise_thenNoJump', () => {
    expect(cruiseProgress(2 - 1e-6, 10, 2, 3)).toBeCloseTo(cruiseProgress(2 + 1e-6, 10, 2, 3), 5);
    expect(cruiseProgress(7 - 1e-6, 10, 2, 3)).toBeCloseTo(cruiseProgress(7 + 1e-6, 10, 2, 3), 5);
  });
});
