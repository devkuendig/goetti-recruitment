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
import {
  createWheel,
  frontPlate,
  profileBody,
  sideMirror,
  slab,
  wheelArch,
  type ProfilePoint,
} from './carParts';

export interface B05 {
  root: Group;
  indicators: MeshToonMaterial[];
  sparkles: Sprite[];
}

/** Side silhouette: short nose, steep windshield, roof sloping into a fastback tail. */
const BODY_PROFILE: ProfilePoint[] = [
  [-2.15, 0.28],
  [2.15, 0.28],
  [2.2, 0.62],
  [2.16, 0.95],
  [2.0, 1.05],
  [1.25, 1.46],
  [0.1, 1.55],
  [-0.6, 1.5],
  [-1.35, 1.03],
  [-2.08, 0.9],
  [-2.2, 0.62],
];
const SIDE_GLASS_PROFILE: ProfilePoint[] = [
  [-1.22, 1.06],
  [1.85, 1.03],
  [1.2, 1.4],
  [0.1, 1.47],
  [-0.55, 1.43],
];
const BODY_WIDTH = 1.85;
const BEVEL = 0.06;
const SIDE_Z = BODY_WIDTH / 2;

/**
 * Leapmotor B05 stand-in built from primitives: sporty fastback, full-width light bars,
 * black panoramic roof, flush door handles. Faces -x.
 * Replace the body of this function with a glTF loader to swap the model.
 */
export function createB05(paint: ColorRepresentation): B05 {
  const root = new Group();
  const paintMaterial = toon(paint);
  const glass = toon(0x1d2a3a);
  const trim = toon(0x1b1b1f);
  const silver = toon(0xd8dde3);

  root.add(profileBody(BODY_PROFILE, BODY_WIDTH, paintMaterial, BEVEL));
  root.add(profileBody(SIDE_GLASS_PROFILE, BODY_WIDTH + 0.02, glass, 0));
  root.add(slab([-1.35, 1.03], [-0.6, 1.5], 1.62, 0.03, glass, BEVEL + 0.01));
  root.add(slab([1.25, 1.46], [2.0, 1.05], 1.5, 0.03, glass, BEVEL + 0.01));
  root.add(slab([-0.6, 1.5], [0.1, 1.55], 1.55, 0.02, trim, BEVEL + 0.01));
  root.add(slab([0.1, 1.55], [1.25, 1.46], 1.55, 0.02, trim, BEVEL + 0.01));

  const bPillar = box(0.1, 0.42, BODY_WIDTH + 0.03, trim);
  bPillar.position.set(0.35, 1.25, 0);
  const skirt = box(4.2, 0.14, BODY_WIDTH + 0.02, trim);
  skirt.position.y = 0.3;
  root.add(bPillar, skirt);
  for (const seamX of [-1.0, 0.38, 1.6]) {
    const seam = box(0.012, 0.6, BODY_WIDTH + 0.015, trim);
    seam.position.set(seamX, 0.68, 0);
    root.add(seam);
  }
  for (const handleX of [-0.3, 0.95]) {
    const handle = box(0.2, 0.03, BODY_WIDTH + 0.02, silver);
    handle.position.set(handleX, 0.94, 0);
    root.add(handle);
  }
  for (const side of [1, -1] as const) {
    const mirror = sideMirror(paintMaterial, side);
    mirror.position.set(-1.05, 1.1, side * (SIDE_Z - 0.05));
    root.add(mirror);
  }

  const lightBarFront = box(0.04, 0.045, 1.62, toon(0xffffff, 0xddeeff));
  lightBarFront.position.set(-2.18, 0.84, 0);
  const lowerGrille = box(0.06, 0.2, 1.2, trim);
  lowerGrille.position.set(-2.25, 0.46, 0);
  const plate = frontPlate('ZH·123 456');
  plate.position.set(-2.29, 0.47, 0);
  const logo = box(0.03, 0.05, 0.16, silver);
  logo.position.set(-2.22, 0.74, 0);
  const lightBarRear = box(0.04, 0.07, 1.7, toon(0xff3344, 0x880011));
  lightBarRear.position.set(2.26, 0.88, 0);
  const sharkFin = cylinder(0.01, 0.06, 0.1, trim);
  sharkFin.scale.set(1.8, 1, 0.5);
  sharkFin.position.set(1.0, 1.58, 0);
  root.add(lightBarFront, lowerGrille, plate, logo, lightBarRear, sharkFin);

  for (const x of [-1.4, 1.4]) {
    for (const side of [1, -1]) {
      const wheel = createWheel({ radius: 0.36, width: 0.24, rimColor: 0xd8dde3, spokes: 5 });
      wheel.position.set(x, 0.36, side * (SIDE_Z - 0.1));
      const arch = wheelArch(0.42, side * (SIDE_Z + 0.005));
      arch.position.x = x;
      arch.position.y = 0.36;
      root.add(wheel, arch);
    }
  }

  const indicators = [-2.22, 2.22].flatMap((x) =>
    [-0.78, 0.78].map((z) => {
      const material = toon(0x7a4a10);
      const indicator = box(0.06, 0.07, 0.16, material);
      indicator.position.set(x, 0.76, z);
      root.add(indicator);
      return material;
    }),
  );

  const sparkles = [
    [-1.7, 1.0, 0.7],
    [0.3, 1.63, 0.6],
    [1.9, 1.05, 0.95],
    [-0.6, 0.8, 0.95],
    [1.2, 1.55, -0.3],
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
