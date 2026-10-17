/** A point on a route: position on the ground (x/z) and heading angle (direction = (cos, sin) in x/z). */
export interface RoutePose {
  x: number;
  z: number;
  heading: number;
}

interface Segment {
  length: number;
  poseAt: (distance: number) => RoutePose;
}

/**
 * Drivable path built turtle-style from straight lines and arcs.
 * Positive arc angles turn right (seen from above with +z towards the viewer: +x → +z).
 */
export class Route {
  private readonly segments: Segment[] = [];
  private end: RoutePose;

  constructor(start: RoutePose) {
    this.end = { ...start };
  }

  get length(): number {
    return this.segments.reduce((sum, segment) => sum + segment.length, 0);
  }

  line(length: number): this {
    const start = { ...this.end };
    this.add(length, (distance) => ({
      x: start.x + Math.cos(start.heading) * distance,
      z: start.z + Math.sin(start.heading) * distance,
      heading: start.heading,
    }));
    return this;
  }

  arc(radius: number, angle: number): this {
    const start = { ...this.end };
    const turn = Math.sign(angle);
    const centerX = start.x - turn * radius * Math.sin(start.heading);
    const centerZ = start.z + turn * radius * Math.cos(start.heading);
    this.add(radius * Math.abs(angle), (distance) => {
      const heading = start.heading + (turn * distance) / radius;
      return {
        x: centerX + turn * radius * Math.sin(heading),
        z: centerZ - turn * radius * Math.cos(heading),
        heading,
      };
    });
    return this;
  }

  /** Pose after driving `distance` metres; clamped to the route's ends. */
  at(distance: number): RoutePose {
    let remaining = Math.max(0, distance);
    for (const segment of this.segments) {
      if (remaining <= segment.length) {
        return segment.poseAt(remaining);
      }
      remaining -= segment.length;
    }
    return { ...this.end };
  }

  private add(length: number, poseAt: (distance: number) => RoutePose): void {
    this.segments.push({ length, poseAt });
    this.end = poseAt(length);
  }
}

/**
 * Progress (0..1) of a drive that speeds up for `rampIn` seconds, cruises, and brakes for
 * `rampOut` seconds to stand still exactly at `total`. Constant acceleration in both ramps.
 */
export function cruiseProgress(elapsed: number, total: number, rampIn: number, rampOut: number): number {
  const time = Math.min(Math.max(elapsed, 0), total);
  const cruiseSpeed = 1 / (total - rampIn / 2 - rampOut / 2);
  if (time < rampIn) {
    return (cruiseSpeed * time * time) / (2 * rampIn);
  }
  if (time <= total - rampOut) {
    return cruiseSpeed * (rampIn / 2 + time - rampIn);
  }
  const remaining = total - time;
  return 1 - (cruiseSpeed * remaining * remaining) / (2 * rampOut);
}
