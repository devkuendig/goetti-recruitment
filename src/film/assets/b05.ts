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
import { frontPlate, sideMirror, slab } from './carParts';

export interface B05 {
  root: Group;
  indicators: MeshToonMaterial[];
  sparkles: Sprite[];
  wheels: Group[];
  /** Rear glass hatch, hinged at the roof. Raise it with a positive `rotation.z`. */
  tailgate: Group;
}

/**
 * Side silhouette traced from press photos (autohled.cz gallery): long low bonnet, raked
 * windshield, long roof ending in a spoiler over a fairly upright hatch window, round tail.
 * Real car: 4.43 m long, 1.88 m wide, 1.52 m high. Extra points round off nose, tail and roof.
 */
const BODY_PROFILE: ProfilePoint[] = [
  [-2.1, 0.3],
  [2.1, 0.3],
  [2.17, 0.36],
  [2.2, 0.5],
  [2.2, 0.82],
  [2.18, 0.92],
  [2.12, 1.0],
  [2.04, 1.04],
  [1.86, 1.4],
  [1.76, 1.44],
  [1.6, 1.46],
  [0.9, 1.495],
  [0.2, 1.505],
  [-0.25, 1.49],
  [-0.5, 1.46],
  [-1.28, 1.03],
  [-1.6, 0.97],
  [-1.95, 0.9],
  [-2.1, 0.85],
  [-2.17, 0.8],
  [-2.21, 0.7],
  [-2.22, 0.55],
  [-2.19, 0.38],
];
/** Window band: high belt line, glass ends in the black C-pillar kick-up. */
const SIDE_GLASS_PROFILE: ProfilePoint[] = [
  [-1.18, 1.06],
  [1.62, 1.08],
  [1.74, 1.36],
  [1.5, 1.42],
  [0.2, 1.46],
  [-0.47, 1.42],
];
const BODY_WIDTH = 1.86;
/** How far the body surface sits outside the profile; details are placed against this. */
const BEVEL = 0.06;
/** Radius of the rounded body edges; the bevel starts inside the outline so the surface stays at BEVEL. */
const BODY_ROUNDING = 0.18;
const SIDE_Z = BODY_WIDTH / 2;
/** The hatch hinges at the rear end of the roof. */
const TAILGATE_HINGE: ProfilePoint = [1.84, 1.42];
const HATCH_BOTTOM: ProfilePoint = [2.04, 1.04];
export const B05_WHEEL_RADIUS = 0.36;
const AXLE_X = [-1.37, 1.37];

/**
 * Leapmotor B05 built from primitives after press photos: rounded hatchback body, thin light
 * bars front and rear, black glass roof, flush door handles, turbine rims. Faces -x.
 * Replace the body of this function with a glTF loader to swap the model.
 */
export function createB05(paint: ColorRepresentation): B05 {
  const root = new Group();
  const paintMaterial = toon(paint);
  const glass = toon(0x1d2a3a);
  const trim = toon(0x1b1b1f);

  root.add(profileBody(BODY_PROFILE, BODY_WIDTH, paintMaterial, BODY_ROUNDING, BEVEL - BODY_ROUNDING, 6));
  // The side glass must stand slightly proud of the body, whose silhouette covers the whole cabin.
  root.add(profileBody(SIDE_GLASS_PROFILE, BODY_WIDTH + 0.02, glass, 0.1, -0.1, 4));
  root.add(slab([-1.28, 1.03], [-0.5, 1.46], 1.64, 0.03, glass, BEVEL + 0.01));
  // Black glass roof from the windshield header to the spoiler.
  root.add(slab([-0.5, 1.46], [0.2, 1.5], 1.6, 0.02, trim, BEVEL + 0.01));
  root.add(slab([0.2, 1.5], [1.6, 1.45], 1.6, 0.02, trim, BEVEL + 0.01));

  // Hatch: black-framed upright glass under a body-coloured spoiler with the third brake light.
  const tailgate = new Group();
  tailgate.position.set(TAILGATE_HINGE[0], TAILGATE_HINGE[1], 0);
  const hatchEnd: ProfilePoint = [HATCH_BOTTOM[0] - TAILGATE_HINGE[0], HATCH_BOTTOM[1] - TAILGATE_HINGE[1]];
  tailgate.add(slab([0, 0], hatchEnd, 1.56, 0.03, trim, BEVEL + 0.005));
  tailgate.add(slab([0, -0.03], [hatchEnd[0], hatchEnd[1] + 0.06], 1.36, 0.03, glass, BEVEL + 0.02));
  const spoiler = slab([-0.25, 0.05], [0.06, 0.0], 1.6, 0.05, paintMaterial, BEVEL + 0.02);
  const brakeLight = box(0.02, 0.025, 0.3, glow(0xff2a3a));
  brakeLight.position.set(0.04, 0.0, 0);
  brakeLight.rotation.z = 0.2;
  tailgate.add(spoiler, brakeLight);
  root.add(tailgate);

  // Black window surround and B-pillar; the C-pillar stays body-coloured like the real car.
  const bPillar = box(0.09, 0.38, BODY_WIDTH + 0.03, trim);
  bPillar.position.set(0.42, 1.25, 0);
  root.add(bPillar);
  // Thin gloss-black sill and black lower bumpers.
  const sill = box(2.0, 0.08, BODY_WIDTH + 0.02, trim);
  sill.position.set(0, 0.36, 0);
  root.add(sill);
  // Door shut lines: front edge of the front door, between the doors, rear edge of the rear door.
  for (const seamX of [-1.02, 0.42, 1.45]) {
    const seam = box(0.01, 0.62, BODY_WIDTH + 0.014, trim);
    seam.position.set(seamX, 0.72, 0);
    root.add(seam);
  }
  // Flush door handles sit high, just under the belt line.
  for (const handleX of [-0.2, 1.05]) {
    const handle = box(0.18, 0.025, BODY_WIDTH + 0.016, toon(0x2a2a30));
    handle.position.set(handleX, 0.98, 0);
    root.add(handle);
  }
  // Gloss-black mirror caps on a body-coloured base at the window corner.
  for (const side of [1, -1] as const) {
    const mirror = sideMirror(trim, side);
    mirror.position.set(-1.0, 1.12, side * (SIDE_Z - 0.05));
    root.add(mirror);
  }
  // Black A-pillar strips framing the windshield.
  for (const side of [1, -1]) {
    const aPillar = slab([-1.28, 1.03], [-0.5, 1.46], 0.08, 0.035, trim, BEVEL + 0.015);
    aPillar.position.z = side * 0.8;
    root.add(aPillar);
  }

  addFrontSignature(root, trim);
  addRearSignature(root, trim);
  addGlassDetails(root, trim);
  const sharkFin = cylinder(0.01, 0.06, 0.1, trim);
  sharkFin.scale.set(1.8, 1, 0.5);
  sharkFin.position.set(1.3, 1.53, 0);
  root.add(sharkFin);

  // Body-coloured arches (no black cladding on the B05); two-tone turbine rims.
  const wheels = AXLE_X.flatMap((x) =>
    [1, -1].map((side) => {
      const wheel = createB05Wheel(side);
      wheel.position.set(x, B05_WHEEL_RADIUS, side * (SIDE_Z - 0.1));
      const arch = new Mesh(new TorusGeometry(0.41, 0.035, 6, 18, Math.PI), paintMaterial);
      arch.position.set(x, B05_WHEEL_RADIUS, side * (SIDE_Z + 0.005));
      root.add(wheel, arch);
      return wheel;
    }),
  );

  // Indicators: in the outer ends of the headlamps and the tail-light bar.
  const indicators = [
    [-2.2, 0.83],
    [2.18, 0.9],
  ].flatMap(([x, y]) =>
    [-0.8, 0.8].map((z) => {
      const material = toon(0x7a4a10);
      material.emissiveIntensity = GLOW_INTENSITY;
      const indicator = box(0.05, 0.03, 0.08, material);
      indicator.position.set(x, y, z);
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
 * Front, as in the photos: no lettering, only the small emblem on the bonnet; a thin gloss-black
 * bar joins the slim headlamps (DRL line along their top edge); plate in a black recess above a
 * wide trapezoid grille with horizontal slats; angular black corner intakes; black splitter.
 */
function addFrontSignature(root: Group, trim: Material): void {
  const led = glow(0xeef6ff);
  const lens = toon(0x1e242c);
  const projectorMaterial = toon(0xc8d4e0, 0x6a7a8a);
  const lightBar = box(0.03, 0.035, 1.0, trim);
  lightBar.position.set(-2.235, 0.84, 0);
  root.add(lightBar);
  for (const side of [1, -1]) {
    const headlamp = box(0.04, 0.06, 0.34, lens);
    headlamp.position.set(-2.225, 0.84, side * 0.66);
    const drl = box(0.02, 0.012, 0.3, led);
    drl.position.set(-2.245, 0.866, side * 0.64);
    const drlTail = box(0.02, 0.01, 0.1, led);
    drlTail.position.set(-2.24, 0.818, side * 0.77);
    root.add(headlamp, drl, drlTail);
    for (const projectorZ of [0.58, 0.68]) {
      const projector = cylinder(0.018, 0.018, 0.02, projectorMaterial);
      projector.rotation.z = Math.PI / 2;
      projector.position.set(-2.247, 0.836, side * projectorZ);
      root.add(projector);
    }
    const cornerIntake = box(0.04, 0.13, 0.26, trim);
    cornerIntake.position.set(-2.255, 0.5, side * 0.7);
    cornerIntake.rotation.x = side * 0.3;
    const intakeSlat = box(0.01, 0.01, 0.2, toon(0x303036));
    intakeSlat.position.set(-2.278, 0.5, side * 0.7);
    intakeSlat.rotation.x = side * 0.3;
    root.add(cornerIntake, intakeSlat);
  }

  // Small chrome emblem on the bonnet, tilted with the bonnet slope.
  const emblem = box(0.08, 0.006, 0.1, toon(0xc9ccd1));
  emblem.position.set(-1.85, 0.985, 0);
  emblem.rotation.z = 0.19;
  root.add(emblem);

  const plateRecess = box(0.03, 0.13, 0.56, trim);
  plateRecess.position.set(-2.27, 0.64, 0);
  const plate = frontPlate('ZH·123 456');
  plate.position.set(-2.29, 0.64, 0);
  const grille = box(0.04, 0.14, 1.0, trim);
  grille.position.set(-2.27, 0.42, 0);
  root.add(plateRecess, plate, grille);
  const slatMaterial = toon(0x303036);
  for (const slatY of [0.38, 0.42, 0.46]) {
    const slat = box(0.01, 0.01, 0.94, slatMaterial);
    slat.position.set(-2.295, slatY, 0);
    root.add(slat);
  }
  const radarPad = box(0.012, 0.06, 0.12, toon(0x26262c));
  radarPad.position.set(-2.3, 0.42, 0);
  const splitter = box(0.12, 0.03, 1.7, trim);
  splitter.position.set(-2.2, 0.32, 0);
  root.add(radarPad, splitter);

  // Wipers parked at the base of the windshield.
  for (const side of [1, -1]) {
    const wiper = box(0.03, 0.015, 0.6, trim);
    wiper.position.set(-1.24, 1.09, side * 0.32);
    wiper.rotation.y = side * 0.12;
    root.add(wiper);
  }
}

/**
 * Rear, as in the photos: thin full-width tail-light bar wrapping onto the flanks, spaced
 * LEAPMOTOR lettering under it, B05 badge on the right, hatch shut line, black lower bumper with
 * slatted panels either side of the plate and red reflectors.
 */
function addRearSignature(root: Group, trim: Material): void {
  const tailLight = glow(0xff2a3a);
  const housing = box(0.03, 0.07, 1.76, toon(0x2a0e10));
  housing.position.set(2.235, 0.9, 0);
  const lightLine = box(0.02, 0.018, 1.5, tailLight);
  lightLine.position.set(2.25, 0.905, 0);
  root.add(housing, lightLine);
  for (const side of [1, -1]) {
    const lampBlock = box(0.02, 0.03, 0.16, tailLight);
    lampBlock.position.set(2.252, 0.89, side * 0.72);
    const wrap = box(0.18, 0.04, 0.02, tailLight);
    wrap.position.set(2.12, 0.9, side * (SIDE_Z + 0.005));
    root.add(lampBlock, wrap);
  }

  const wordmark = wordmarkPlane('L E A P M O T O R', 0.62, '#d8dde3');
  wordmark.position.set(2.265, 0.8, 0);
  wordmark.rotation.y = Math.PI / 2;
  const badge = wordmarkPlane('B05', 0.16, '#d8dde3');
  badge.position.set(2.265, 0.7, -0.6);
  badge.rotation.y = Math.PI / 2;
  const hatchShutLine = box(0.01, 0.01, 1.3, trim);
  hatchShutLine.position.set(2.265, 0.63, 0);
  root.add(wordmark, badge, hatchShutLine);

  const lowerBumper = box(0.04, 0.22, 1.74, trim);
  lowerBumper.position.set(2.255, 0.41, 0);
  const plate = frontPlate('ZH·123 456');
  plate.rotation.y = Math.PI / 2;
  plate.position.set(2.29, 0.53, 0);
  const camera = box(0.02, 0.03, 0.05, toon(0x26262c));
  camera.position.set(2.27, 0.6, 0);
  root.add(lowerBumper, plate, camera);
  const slatMaterial = toon(0x303036);
  const reflector = toon(0x8a1a22, 0x3a0008);
  for (const side of [1, -1]) {
    for (const slatY of [0.5, 0.53, 0.56]) {
      const slat = box(0.01, 0.01, 0.4, slatMaterial);
      slat.position.set(2.28, slatY, side * 0.56);
      root.add(slat);
    }
    const reflectorStrip = box(0.02, 0.025, 0.16, reflector);
    reflectorStrip.position.set(2.28, 0.4, side * 0.6);
    root.add(reflectorStrip);
  }
}

/** Black window surround (belt line, roof rail, C-pillar edge) and the side camera on each fender. */
function addGlassDetails(root: Group, trim: Material): void {
  for (const side of [1, -1]) {
    const sideZ = side * (SIDE_Z + 0.012);
    const frames = [
      slab([-1.18, 1.06], [1.62, 1.08], 0.02, 0.03, trim),
      slab([-0.47, 1.42], [0.2, 1.46], 0.02, 0.03, trim),
      slab([0.2, 1.46], [1.5, 1.42], 0.02, 0.03, trim),
      slab([1.62, 1.08], [1.74, 1.36], 0.02, 0.04, trim),
    ];
    for (const frame of frames) {
      frame.position.z = sideZ;
      root.add(frame);
    }
    const sideCamera = box(0.1, 0.04, 0.012, trim);
    sideCamera.position.set(-1.2, 0.95, side * (SIDE_Z + 0.015));
    root.add(sideCamera);
  }
}

const RIM_RADIUS = 0.245;
const TURBINE_SPOKES = 10;
/** Sideways lean of each spoke, gives the twisted "turbine" look of the B05 rims. */
const SPOKE_TWIST = 0.35;

/**
 * B05 wheel after the photos: rounded low-profile tyre, black rim face with ten twisted
 * machined-silver spokes, silver lip and centre cap. Spins around its local z axis;
 * `side` (+1 left, -1 right) turns the spoke face outwards.
 */
function createB05Wheel(side: number): Group {
  const wheel = new Group();
  const face = new Group();
  face.scale.z = side;
  wheel.add(face);

  const tyreTube = (B05_WHEEL_RADIUS - RIM_RADIUS) / 2 + 0.01;
  const tyre = new Mesh(new TorusGeometry(B05_WHEEL_RADIUS - tyreTube, tyreTube, 12, 36), toon(0x18181c));
  tyre.scale.z = 2.0;
  const barrel = cylinder(RIM_RADIUS, RIM_RADIUS, 0.2, toon(0x2a2a30));
  barrel.rotation.x = Math.PI / 2;
  const rimFace = cylinder(RIM_RADIUS - 0.005, RIM_RADIUS - 0.005, 0.01, toon(0x141418));
  rimFace.rotation.x = Math.PI / 2;
  rimFace.position.z = 0.1;
  face.add(tyre, barrel, rimFace);

  const machined = toon(0xc9ccd1);
  const lip = new Mesh(new TorusGeometry(RIM_RADIUS - 0.006, 0.008, 6, 36), machined);
  lip.position.z = 0.106;
  face.add(lip);
  for (let spoke = 0; spoke < TURBINE_SPOKES; spoke++) {
    const angle = (spoke * Math.PI * 2) / TURBINE_SPOKES;
    const spokeLength = RIM_RADIUS - 0.05;
    const spokeMesh = box(spokeLength, 0.03, 0.014, machined);
    const middle = 0.04 + spokeLength / 2;
    spokeMesh.position.set(Math.cos(angle) * middle, Math.sin(angle) * middle, 0.11);
    spokeMesh.rotation.z = angle + SPOKE_TWIST;
    face.add(spokeMesh);
  }
  const centreCap = cylinder(0.05, 0.05, 0.02, machined);
  centreCap.rotation.x = Math.PI / 2;
  centreCap.position.z = 0.115;
  const capEmblem = cylinder(0.025, 0.025, 0.004, toon(0x141418));
  capEmblem.rotation.x = Math.PI / 2;
  capEmblem.position.z = 0.126;
  face.add(centreCap, capEmblem);
  return wheel;
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
