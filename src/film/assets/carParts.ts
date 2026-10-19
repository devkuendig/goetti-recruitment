import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, TorusGeometry, type Material } from 'three';
import { box, cylinder, textTexture, toon, type ProfilePoint } from '../engine/build';

/** Shared parts for every car. Cars face -x, +z is the driver (left) side. */

/**
 * Thin panel spanning two profile points — windshields, rear glass, roof trims.
 * `offset` pushes it outwards along the left-hand normal (front → back along the top
 * of a profile = outwards), e.g. to sit on top of a bevelled body.
 */
export function slab(
  from: ProfilePoint,
  to: ProfilePoint,
  width: number,
  thickness: number,
  material: Material,
  offset = 0,
): Mesh {
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY);
  const panel = box(length, thickness, width, material);
  panel.position.set(
    (from[0] + to[0]) / 2 - (deltaY / length) * offset,
    (from[1] + to[1]) / 2 + (deltaX / length) * offset,
    0,
  );
  panel.rotation.z = Math.atan2(deltaY, deltaX);
  return panel;
}

export interface WheelOptions {
  radius: number;
  width: number;
  rimColor: number;
  spokes: number;
}

/** Tyre, rim, spokes and hub. Spins around its local z axis. */
export function createWheel(options: WheelOptions): Group {
  const wheel = new Group();
  const turned = new Group();
  turned.rotation.x = Math.PI / 2;
  wheel.add(turned);
  const rimMaterial = toon(options.rimColor);
  const tyre = cylinder(options.radius, options.radius, options.width, toon(0x18181c));
  const rimRadius = options.radius * 0.66;
  const rim = cylinder(rimRadius, rimRadius, options.width + 0.01, toon(0x2a2a30));
  const hub = cylinder(rimRadius * 0.25, rimRadius * 0.25, options.width + 0.04, rimMaterial);
  turned.add(tyre, rim, hub);
  for (let spoke = 0; spoke < options.spokes; spoke++) {
    const spokeMesh = box(rimRadius * 1.9, options.width + 0.02, rimRadius * 0.22, rimMaterial);
    spokeMesh.rotation.y = (spoke * Math.PI) / options.spokes;
    turned.add(spokeMesh);
  }
  return wheel;
}

/** Black half-ring over a wheel, sitting on the car side at `sideZ`. */
export function wheelArch(radius: number, sideZ: number): Mesh {
  const arch = new Mesh(new TorusGeometry(radius, 0.05, 6, 18, Math.PI), toon(0x1b1b1f));
  arch.position.z = sideZ;
  return arch;
}

export function sideMirror(paint: Material, side: 1 | -1): Group {
  const mirror = new Group();
  const stalk = box(0.08, 0.04, 0.12, toon(0x1b1b1f));
  stalk.position.z = side * 0.06;
  const housing = box(0.12, 0.13, 0.2, paint);
  housing.position.z = side * 0.18;
  const glass = box(0.01, 0.1, 0.16, toon(0x9fc4e8));
  glass.position.set(0.065, 0, side * 0.18);
  mirror.add(stalk, housing, glass);
  return mirror;
}

/** Swiss-style front plate (white, black letters, little canton shield). Faces -x. */
export function frontPlate(text: string): Mesh {
  const texture = textTexture(text, {
    width: 512,
    height: 112,
    font: 'bold 72px "DIN Alternate", "Arial Narrow", Arial, sans-serif',
    color: '#111111',
    background: '#ffffff',
  });
  const plate = new Mesh(new PlaneGeometry(0.5, 0.11), new MeshBasicMaterial({ map: texture }));
  plate.material.userData.outlineParameters = { visible: false };
  plate.rotation.y = -Math.PI / 2;
  return plate;
}
