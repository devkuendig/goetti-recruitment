import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  type ColorRepresentation,
  type Material,
  type MeshToonMaterial,
} from 'three';
import {
  box,
  cylinder,
  glow,
  GLOW_INTENSITY,
  profileBody,
  sphere,
  textTexture,
  toon,
  type ProfilePoint,
} from '../engine/build';
import { createBanana } from './bananas';
import { createWheel, frontPlate, sideMirror, slab, wheelArch } from './carParts';

export interface B05 {
  root: Group;
  indicators: MeshToonMaterial[];
  sparkles: Sprite[];
  wheels: Group[];
  /** Rear glass hatch, hinged at the roof. Raise it with a positive `rotation.z`. */
  tailgate: Group;
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
const TAILGATE_HINGE: ProfilePoint = [1.25, 1.46];
export const B05_WHEEL_RADIUS = 0.36;

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
  const tailgate = new Group();
  tailgate.position.set(TAILGATE_HINGE[0], TAILGATE_HINGE[1], 0);
  const rearGlass = slab([0, 0], [2.0 - TAILGATE_HINGE[0], 1.05 - TAILGATE_HINGE[1]], 1.5, 0.03, glass, BEVEL + 0.01);
  tailgate.add(rearGlass);
  root.add(tailgate);
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

  // Black A-pillars + black roof = the B05's "floating roof" two-tone look.
  for (const side of [1, -1]) {
    const aPillar = slab([-1.35, 1.03], [-0.6, 1.5], 0.09, 0.035, trim, BEVEL + 0.015);
    aPillar.position.z = side * 0.78;
    root.add(aPillar);
  }
  const roofSpoiler = slab([1.15, 1.5], [1.75, 1.36], 1.5, 0.04, trim, BEVEL + 0.02);
  root.add(roofSpoiler);

  addFrontSignature(root, trim);
  addRearSignature(root, trim);
  addBadges(root);
  const sharkFin = cylinder(0.01, 0.06, 0.1, trim);
  sharkFin.scale.set(1.8, 1, 0.5);
  sharkFin.position.set(1.0, 1.58, 0);
  root.add(sharkFin);

  const wheels = [-1.4, 1.4].flatMap((x) =>
    [1, -1].map((side) => {
      const wheel = createWheel({ radius: B05_WHEEL_RADIUS, width: 0.24, rimColor: 0xd8dde3, spokes: 5 });
      wheel.position.set(x, B05_WHEEL_RADIUS, side * (SIDE_Z - 0.1));
      const arch = wheelArch(0.42, side * (SIDE_Z + 0.005));
      arch.position.x = x;
      arch.position.y = B05_WHEEL_RADIUS;
      root.add(wheel, arch);
      return wheel;
    }),
  );

  const indicators = [-2.22, 2.22].flatMap((x) =>
    [-0.78, 0.78].map((z) => {
      const material = toon(0x7a4a10);
      material.emissiveIntensity = GLOW_INTENSITY;
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

  return { root, indicators, sparkles, wheels, tailgate };
}

export interface B05Cockpit {
  root: Group;
  steeringWheel: Group;
  /** Banana air freshener hanging from the rear-view mirror; swing it with `rotation.x`/`rotation.z`. */
  freshener: Group;
  /** Bananas from the roof load, dangling into the top of the windshield. Hidden until loaded. */
  roofBananas: Group;
}

const DASH_COLOR = 0x2a2a30;

/**
 * What Alain sees from the driver's seat. Parent it to the camera (camera looks down -z):
 * the car body itself is hidden in this view, so the hood, pillars and dashboard are drawn here.
 * The driver sits left, so the car's centre is ~0.38 m to the right (+x).
 */
export function createB05Cockpit(paint: ColorRepresentation): B05Cockpit {
  const root = new Group();
  const dash = toon(DASH_COLOR);
  const centerX = 0.38;

  const hood = box(1.9, 0.05, 1.6, toon(paint));
  hood.position.set(centerX, -0.66, -1.85);
  hood.rotation.x = -0.07;
  const dashboard = box(2.0, 0.2, 0.5, dash);
  dashboard.position.set(centerX, -0.46, -0.85);
  const dashTop = box(2.0, 0.03, 0.3, toon(0x3a3a42));
  dashTop.position.set(centerX, -0.35, -0.95);
  root.add(hood, dashboard, dashTop);

  // The B05's floating centre screen, showing the map.
  const screen = box(0.34, 0.2, 0.02, toon(0x1f2f45, 0x0f2a45));
  screen.position.set(centerX + 0.05, -0.27, -0.8);
  screen.rotation.x = -0.15;
  const mapRoad = box(0.025, 0.16, 0.005, toon(0x7fd0ff, 0x2a6a9a));
  mapRoad.position.set(0, 0, 0.012);
  mapRoad.rotation.z = 0.5;
  screen.add(mapRoad);
  root.add(screen);

  for (const x of [centerX - 1.1, centerX + 1.1]) {
    const pillar = box(0.07, 1.1, 0.07, dash);
    pillar.position.set(x, -0.02, -0.95);
    pillar.rotation.x = 0.55;
    pillar.rotation.z = Math.sign(x - centerX) * -0.12;
    root.add(pillar);
  }
  const headliner = box(2.1, 0.08, 0.5, toon(0x4a4a52));
  headliner.position.set(centerX, 0.46, -0.35);
  const mirrorStalk = box(0.03, 0.08, 0.03, dash);
  mirrorStalk.position.set(centerX, 0.39, -0.52);
  const rearMirror = box(0.26, 0.08, 0.03, dash);
  rearMirror.position.set(centerX, 0.33, -0.52);
  const mirrorGlass = box(0.23, 0.06, 0.005, toon(0x9fc4e8));
  mirrorGlass.position.set(centerX, 0.33, -0.535);
  root.add(headliner, mirrorStalk, rearMirror, mirrorGlass);

  const freshener = new Group();
  freshener.position.set(centerX + 0.06, 0.29, -0.52);
  const string = box(0.004, 0.12, 0.004, toon(0x5a5a62));
  string.position.y = -0.06;
  const banana = createBanana();
  banana.position.y = -0.14;
  banana.scale.setScalar(0.45);
  freshener.add(string, banana);
  root.add(freshener);

  const steeringWheel = new Group();
  steeringWheel.position.set(0, -0.4, -0.52);
  steeringWheel.rotation.x = -0.35;
  const rim = new Mesh(new TorusGeometry(0.17, 0.022, 8, 28), dash);
  const hub = cylinder(0.05, 0.05, 0.04, toon(0x3a3a42));
  hub.rotation.x = Math.PI / 2;
  steeringWheel.add(rim, hub);
  for (const angle of [Math.PI / 2 + 0.3, Math.PI / 2 - 0.3 + Math.PI, -Math.PI / 2]) {
    const spoke = box(0.15, 0.025, 0.02, dash);
    spoke.position.set(Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0);
    spoke.rotation.z = angle;
    steeringWheel.add(spoke);
  }
  // Hands at ten to two, in the same blue sleeves as the walking POV.
  for (const side of [-1, 1]) {
    const hand = sphere(0.04, toon(0xf5c9a0));
    hand.position.set(side * 0.15, 0.08, 0.02);
    hand.scale.set(1, 1.2, 0.9);
    const sleeve = cylinder(0.045, 0.05, 0.3, toon(0x2f4f7f));
    sleeve.position.set(side * 0.2, -0.05, 0.12);
    sleeve.rotation.set(1.1, 0, side * 0.5);
    steeringWheel.add(hand, sleeve);
  }
  root.add(steeringWheel);

  const roofBananas = new Group();
  roofBananas.visible = false;
  for (let index = 0; index < 5; index++) {
    const dangling = createBanana();
    dangling.position.set(centerX - 0.7 + index * 0.33, 0.62 - (index % 2) * 0.05, -1.05);
    dangling.rotation.set(0, 0.3 * index, Math.PI + (index % 2 === 0 ? 0.4 : -0.3));
    roofBananas.add(dangling);
  }
  root.add(roofBananas);

  root.traverse((node) => {
    node.castShadow = false;
    node.receiveShadow = false;
  });
  return { root, steeringWheel, freshener, roofBananas };
}

/**
 * Front: slim full-width LED strip ending in headlamp clusters with vertical DRL
 * "fangs", closed EV nose, wide black lower intake with corner vents.
 */
function addFrontSignature(root: Group, trim: Material): void {
  const led = glow(0xeef6ff);
  const strip = box(0.04, 0.035, 1.3, led);
  strip.position.set(-2.18, 0.86, 0);
  root.add(strip);
  for (const side of [1, -1]) {
    const cluster = box(0.06, 0.09, 0.26, toon(0x2a3340));
    cluster.position.set(-2.17, 0.83, side * 0.72);
    const lamp = box(0.065, 0.05, 0.2, led);
    lamp.position.set(-2.175, 0.835, side * 0.72);
    const fang = box(0.04, 0.14, 0.03, led);
    fang.position.set(-2.235, 0.72, side * 0.83);
    const cornerVent = box(0.06, 0.16, 0.22, trim);
    cornerVent.position.set(-2.255, 0.48, side * 0.72);
    cornerVent.rotation.x = side * 0.25;
    root.add(cluster, lamp, fang, cornerVent);
  }
  const intake = box(0.06, 0.16, 1.0, trim);
  intake.position.set(-2.25, 0.44, 0);
  const wordmark = wordmarkPlane('LEAPMOTOR', 0.62, '#e9eef4');
  wordmark.position.set(-2.245, 0.7, 0);
  wordmark.rotation.y = -Math.PI / 2;
  const plate = frontPlate('ZH·123 456');
  plate.position.set(-2.29, 0.45, 0);
  root.add(intake, wordmark, plate);
}

/** Rear: full-width tail-light bar, LEAPMOTOR lettering, B05 badge. */
function addRearSignature(root: Group, trim: Material): void {
  const tailBar = box(0.04, 0.06, 1.72, glow(0xff2a3a));
  tailBar.position.set(2.24, 0.9, 0);
  const diffuser = box(0.06, 0.14, 1.3, trim);
  diffuser.position.set(2.22, 0.4, 0);
  const wordmark = wordmarkPlane('LEAPMOTOR', 0.7, '#e9eef4');
  wordmark.position.set(2.255, 0.76, 0);
  wordmark.rotation.y = Math.PI / 2;
  const badge = wordmarkPlane('B05', 0.2, '#e9eef4');
  badge.position.set(2.265, 0.66, -0.6);
  badge.rotation.y = Math.PI / 2;
  root.add(tailBar, diffuser, wordmark, badge);
}

/** "B05" model badges on both front fenders — readable from Alain's side. */
function addBadges(root: Group): void {
  for (const side of [1, -1]) {
    const badge = wordmarkPlane('B05', 0.24, '#e9eef4');
    badge.position.set(-1.25, 0.82, side * (SIDE_Z + 0.012));
    badge.rotation.y = side > 0 ? 0 : Math.PI;
    root.add(badge);
  }
}

/** Chrome-ish lettering with transparent background. */
function wordmarkPlane(text: string, width: number, color: string): Mesh {
  const texture = textTexture(text, {
    width: 512,
    height: 96,
    font: 'bold 70px "Eurostile", "Arial Black", Arial, sans-serif',
    color,
    background: 'rgba(0,0,0,0)',
  });
  const plane = new Mesh(
    new PlaneGeometry(width, width * (96 / 512)),
    new MeshBasicMaterial({ map: texture, transparent: true }),
  );
  plane.material.userData.outlineParameters = { visible: false };
  return plane;
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
  material.color.setScalar(GLOW_INTENSITY * 0.75);
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
