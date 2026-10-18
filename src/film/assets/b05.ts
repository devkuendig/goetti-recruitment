import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Sprite,
  SpriteMaterial,
  type ColorRepresentation,
  type MeshToonMaterial,
} from 'three';
import { box, cylinder, toon } from '../engine/build';

export interface B05 {
  root: Group;
  indicators: MeshToonMaterial[];
  sparkles: Sprite[];
}

/**
 * Leapmotor B05 stand-in built from primitives: low hatchback, full-width light bars.
 * Faces -x. Replace the body of this function with a glTF loader to swap the model.
 */
export function createB05(paint: ColorRepresentation): B05 {
  const root = new Group();
  const paintMaterial = toon(paint);
  const glass = toon(0x1d2a3a);
  const trim = toon(0x1b1b1f);

  const body = box(4.4, 0.7, 1.85, paintMaterial);
  body.position.y = 0.6;
  const hood = box(1.1, 0.18, 1.8, paintMaterial);
  hood.position.set(-1.6, 0.98, 0);
  const cabin = box(2.5, 0.62, 1.66, glass);
  cabin.position.set(0.25, 1.24, 0);
  const roof = box(2.2, 0.08, 1.6, paintMaterial);
  roof.position.set(0.3, 1.58, 0);
  const skirt = box(4.42, 0.16, 1.87, trim);
  skirt.position.y = 0.3;
  root.add(body, hood, cabin, roof, skirt);

  const lightBarFront = box(0.04, 0.06, 1.6, toon(0xffffff, 0xddeeff));
  lightBarFront.position.set(-2.21, 0.86, 0);
  const lightBarRear = box(0.04, 0.08, 1.7, toon(0xff3344, 0x880011));
  lightBarRear.position.set(2.21, 0.86, 0);
  root.add(lightBarFront, lightBarRear);

  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.85, 0.85]) {
      const tire = cylinder(0.36, 0.36, 0.26, trim);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, 0.36, z);
      const rim = cylinder(0.22, 0.22, 0.27, toon(0xd8dde3));
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(tire.position);
      root.add(tire, rim);
    }
  }

  const indicators = [-2.19, 2.19].flatMap((x) =>
    [-0.82, 0.82].map((z) => {
      const material = toon(0x7a4a10);
      const indicator = box(0.06, 0.08, 0.16, material);
      indicator.position.set(x, 0.75, z);
      root.add(indicator);
      return material;
    }),
  );

  const sparkles = [
    [-1.6, 1.08, 0.7],
    [0.3, 1.63, 0.6],
    [1.9, 0.95, 0.93],
    [-0.6, 0.8, 0.93],
    [1.2, 1.63, -0.3],
  ].map(([x, y, z]) => {
    const sparkle = createSparkle();
    sparkle.position.set(x, y, z);
    root.add(sparkle);
    return sparkle;
  });

  return { root, indicators, sparkles };
}

export function setIndicators(car: B05, isOn: boolean): void {
  for (const indicator of car.indicators) {
    indicator.color.set(isOn ? 0xffb020 : 0x7a4a10);
    indicator.emissive.set(isOn ? 0xff8800 : 0x000000);
  }
}

let sparkleTexture: CanvasTexture | undefined;

/** Four-pointed cartoon star, shared by every sparkle and glint in the film. */
export function createSparkle(): Sprite {
  sparkleTexture ??= drawSparkleTexture();
  const material = new SpriteMaterial({
    map: sparkleTexture,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  material.userData.outlineParameters = { visible: false };
  const sparkle = new Sprite(material);
  sparkle.scale.setScalar(0);
  return sparkle;
}

function drawSparkleTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context unavailable — cannot draw sparkle');
  }
  const center = size / 2;
  context.fillStyle = '#ffffff';
  context.beginPath();
  for (let point = 0; point < 8; point++) {
    const angle = (point * Math.PI) / 4;
    const radius = point % 2 === 0 ? center : center * 0.14;
    context.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
  }
  context.closePath();
  context.fill();
  return new CanvasTexture(canvas);
}
