import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, TorusGeometry, type Material } from 'three';
import { box, cylinder, sphere, textTexture, toon } from '../engine/build';
import { createWheel, frontPlate, profileBody, sideMirror, slab, type ProfilePoint } from './carParts';

export interface TunedCar {
  root: Group;
  /** Sprung part of the car — bounces to the bass. */
  body: Group;
  wheels: Group[];
  /** Where the driver sits, just inside the open front-left window. */
  driverSeat: Group;
  hoodPacifier: Group;
  fuzzyDice: Group;
}

/** Slammed hot hatch: wedge nose, long hood with scoop, short square tail. */
const LOWER_BODY_PROFILE: ProfilePoint[] = [
  [-2.3, 0.2],
  [2.3, 0.2],
  [2.34, 0.7],
  [2.22, 0.8],
  [-1.15, 0.8],
  [-2.2, 0.66],
  [-2.36, 0.4],
];
const BODY_WIDTH = 1.95;
const SIDE_Z = BODY_WIDTH / 2;
const CABIN_BOTTOM = 0.8;
const CABIN_TOP = 1.26;
const WINDSHIELD_BASE: ProfilePoint = [-1.15, CABIN_BOTTOM];
const WINDSHIELD_TOP: ProfilePoint = [-0.72, CABIN_TOP];
const REAR_TOP: ProfilePoint = [1.05, CABIN_TOP];
const REAR_BASE: ProfilePoint = [1.25, CABIN_BOTTOM];

/** Lowered purple hatch with flames, spoiler and underglow. Faces -x, driver side is +z. */
export function createTunedCar(): TunedCar {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const paint = toon(0x7b3fc4);
  const tint = toon(0x111116);
  const carbon = toon(0x26262c);
  const gold = toon(0xe8c34a);

  body.add(profileBody(LOWER_BODY_PROFILE, BODY_WIDTH, paint, 0.05));
  addCabin(body, paint, tint);
  addAeroKit(body, carbon, tint);
  addFrontEnd(body, carbon, gold);
  addRear(body, gold);
  addFlames(body);
  addStickers(body);

  for (const side of [1, -1] as const) {
    const mirror = sideMirror(paint, side);
    mirror.position.set(-0.95, 0.92, side * (SIDE_Z - 0.06));
    body.add(mirror);
  }

  const hoodPacifier = createPacifier(0xff6fb5, 0.9);
  hoodPacifier.position.set(-1.9, 0.82, 0);
  body.add(hoodPacifier);

  const driverSeat = new Group();
  driverSeat.position.set(-0.4, 0.5, 0.42);
  body.add(driverSeat);
  addCockpit(body);
  const fuzzyDice = createFuzzyDice();
  fuzzyDice.position.set(-0.75, 1.2, 0);
  body.add(fuzzyDice);

  const underglow = new Mesh(new PlaneGeometry(4.2, 2.2), new MeshBasicMaterial({ color: 0x39ff88 }));
  underglow.material.userData.outlineParameters = { visible: false };
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.02;
  root.add(underglow);

  const wheels = [-1.5, 1.5].flatMap((x) =>
    [-1, 1].map((side) => {
      const wheel = createWheel({ radius: 0.34, width: 0.28, rimColor: 0xe8c34a, spokes: 6 });
      wheel.position.set(x, 0.34, side * (SIDE_Z - 0.04));
      root.add(wheel);
      const caliper = box(0.12, 0.16, 0.05, toon(0xe02424));
      caliper.position.set(x + 0.1, 0.42, side * (SIDE_Z - 0.12));
      root.add(caliper);
      return wheel;
    }),
  );

  return { root, body, wheels, driverSeat, hoodPacifier, fuzzyDice };
}

/** Roof on four pillars; the front-left (driver) window is wide open. */
function addCabin(body: Group, paint: Material, tint: Material): void {
  const roof = slab(WINDSHIELD_TOP, REAR_TOP, 1.72, 0.07, paint);
  body.add(roof);
  for (const side of [1, -1]) {
    const aPillar = slab(WINDSHIELD_BASE, WINDSHIELD_TOP, 0.06, 0.07, paint);
    aPillar.position.z = side * 0.84;
    const cPillar = slab(REAR_TOP, REAR_BASE, 0.06, 0.12, paint);
    cPillar.position.z = side * 0.84;
    const bPillar = box(0.08, CABIN_TOP - CABIN_BOTTOM, 0.06, paint);
    bPillar.position.set(0.1, (CABIN_TOP + CABIN_BOTTOM) / 2, side * 0.84);
    body.add(aPillar, cPillar, bPillar);
  }
  body.add(slab(WINDSHIELD_BASE, WINDSHIELD_TOP, 1.62, 0.03, tint));
  body.add(slab(REAR_TOP, REAR_BASE, 1.62, 0.03, tint));
  const passengerGlass = box(1.95, CABIN_TOP - CABIN_BOTTOM, 0.03, tint);
  passengerGlass.position.set(0.15, (CABIN_TOP + CABIN_BOTTOM) / 2, -0.84);
  const rearDriverGlass = box(1.05, CABIN_TOP - CABIN_BOTTOM, 0.03, tint);
  rearDriverGlass.position.set(0.65, (CABIN_TOP + CABIN_BOTTOM) / 2, 0.84);
  const loweredWindowEdge = box(1.1, 0.03, 0.03, tint);
  loweredWindowEdge.position.set(-0.5, CABIN_BOTTOM + 0.02, 0.84);
  body.add(passengerGlass, rearDriverGlass, loweredWindowEdge);
}


function addAeroKit(body: Group, carbon: Material, tint: Material): void {
  const splitter = box(0.3, 0.04, BODY_WIDTH + 0.1, carbon);
  splitter.position.set(-2.38, 0.2, 0);
  body.add(splitter);
  for (const side of [1, -1]) {
    const skirt = box(2.2, 0.1, 0.08, carbon);
    skirt.position.set(0, 0.24, side * (SIDE_Z + 0.02));
    body.add(skirt);
    for (const x of [-1.5, 1.5]) {
      const flare = box(0.95, 0.12, 0.1, carbon);
      flare.position.set(x, 0.72, side * (SIDE_Z + 0.03));
      body.add(flare);
    }
  }
  const hoodScoop = box(0.5, 0.1, 0.5, carbon);
  hoodScoop.position.set(-1.5, 0.82, 0);
  const scoopMouth = box(0.02, 0.06, 0.4, toon(0x050505));
  scoopMouth.position.set(-1.76, 0.83, 0);
  const roofScoop = box(0.35, 0.07, 0.3, carbon);
  roofScoop.position.set(-0.2, CABIN_TOP + 0.07, 0);
  body.add(hoodScoop, scoopMouth, roofScoop);

  const spoilerWing = box(0.45, 0.05, 2.1, tint);
  spoilerWing.position.set(2.1, 1.35, 0);
  body.add(spoilerWing);
  for (const side of [1, -1]) {
    const strut = box(0.08, 0.55, 0.06, tint);
    strut.position.set(2.1, 1.07, side * 0.65);
    const endplate = box(0.5, 0.22, 0.03, toon(0x39ff88));
    endplate.position.set(2.1, 1.38, side * 1.06);
    body.add(strut, endplate);
  }
}

/** Angry squinting headlights, honeycomb grille, gold badge and the plate. */
function addFrontEnd(body: Group, carbon: Material, gold: Material): void {
  const grille = box(0.06, 0.22, 1.1, carbon);
  grille.position.set(-2.37, 0.48, 0);
  body.add(grille);
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 6; column++) {
      const cell = box(0.02, 0.05, 0.1, toon(0x050505));
      cell.position.set(-2.405, 0.42 + row * 0.1, -0.42 + column * 0.17 + (row % 2) * 0.08);
      body.add(cell);
    }
  }
  const badge = box(0.03, 0.06, 0.18, gold);
  badge.position.set(-2.34, 0.62, 0);
  body.add(badge);
  for (const side of [1, -1]) {
    const headlight = box(0.05, 0.1, 0.4, toon(0xffffee, 0xbbbbaa));
    headlight.position.set(-2.3, 0.62, side * 0.68);
    headlight.rotation.x = side * 0.18;
    const eyelid = box(0.06, 0.04, 0.42, carbon);
    eyelid.position.set(-2.31, 0.68, side * 0.66);
    eyelid.rotation.x = side * -0.3;
    body.add(headlight, eyelid);
  }
  const plate = frontPlate('ZH·2 COOL');
  plate.position.set(-2.4, 0.3, 0);
  body.add(plate);
}

function addRear(body: Group, gold: Material): void {
  for (const z of [-0.45, -0.75]) {
    const exhaust = cylinder(0.11, 0.11, 0.4, gold);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(2.42, 0.3, z);
    const soot = cylinder(0.08, 0.08, 0.41, toon(0x111111));
    soot.rotation.z = Math.PI / 2;
    soot.position.copy(exhaust.position);
    body.add(exhaust, soot);
  }
  const tailLights = box(0.04, 0.1, 1.7, toon(0xff2a3a, 0x880011));
  tailLights.position.set(2.4, 0.66, 0);
  body.add(tailLights);
}

function addFlames(body: Group): void {
  const flameColors = [0xff5a1f, 0xffb21f, 0xff5a1f, 0xffd84a];
  for (const side of [1, -1]) {
    flameColors.forEach((color, index) => {
      const flame = box(0.9 - index * 0.12, 0.08, 0.02, toon(color));
      flame.position.set(-1.6 + index * 0.2, 0.42 + index * 0.08, side * (SIDE_Z + 0.01));
      flame.rotation.z = -0.15;
      body.add(flame);
    });
  }
}

function sticker(text: string, width: number, colors: { color: string; background: string }): Mesh {
  const texture = textTexture(text, {
    width: 512,
    height: 128,
    font: 'bold 54px Impact, "Arial Black", sans-serif',
    ...colors,
  });
  const decal = new Mesh(new PlaneGeometry(width, width / 4), new MeshBasicMaterial({ map: texture }));
  decal.material.userData.outlineParameters = { visible: false };
  return decal;
}

/** Sponsor decals on the driver side — the kid's racing team. */
function addStickers(body: Group): void {
  const babyOnBoard = sticker('🔥 BABY AN BORD 🔥', 0.9, { color: '#ff5a1f', background: '#ffef9a' });
  babyOnBoard.position.set(1.4, 0.55, SIDE_Z + 0.012);
  const sponsor = sticker('MILCHSCHNITTE RACING', 0.8, { color: '#ffffff', background: '#1f6fe0' });
  sponsor.position.set(0.55, 0.48, SIDE_Z + 0.012);
  const gang = sticker('NUGGI GANG', 0.6, { color: '#39ff88', background: '#111116' });
  gang.position.set(-1.75, 0.6, SIDE_Z + 0.012);
  body.add(babyOnBoard, sponsor, gang);
}

/** Steering wheel and booster-cushion seat, visible through the open window. */
function addCockpit(body: Group): void {
  const steeringWheel = new Mesh(new TorusGeometry(0.15, 0.025, 8, 20), toon(0x1b1b1f));
  steeringWheel.position.set(-0.68, 0.98, 0.42);
  steeringWheel.rotation.y = Math.PI / 2;
  steeringWheel.rotation.x = 0.4;
  const column = cylinder(0.025, 0.025, 0.25, toon(0x1b1b1f));
  column.rotation.z = Math.PI / 2 - 0.4;
  column.position.set(-0.8, 0.93, 0.42);
  const dashboard = box(0.35, 0.12, 1.62, toon(0x2b2b30));
  dashboard.position.set(-0.95, 0.86, 0);
  const seatBack = box(0.12, 0.55, 0.5, toon(0x2b2b30));
  seatBack.position.set(-0.05, 0.98, 0.42);
  body.add(steeringWheel, column, dashboard, seatBack);
}

function createFuzzyDice(): Group {
  const dice = new Group();
  const string = box(0.008, 0.12, 0.008, toon(0xffffff));
  string.position.y = -0.06;
  dice.add(string);
  for (const side of [-1, 1]) {
    const die = box(0.07, 0.07, 0.07, toon(0xff6fb5));
    die.position.set(0, -0.15, side * 0.045);
    die.rotation.set(0.4 * side, 0.3, 0.2);
    dice.add(die);
  }
  return dice;
}

export function createPacifier(color: number, scale: number): Group {
  const pacifier = new Group();
  const shield = box(0.22, 0.14, 0.04, toon(color));
  const nipple = sphere(0.06, toon(0xf3e2b0));
  nipple.position.z = -0.05;
  const ring = cylinder(0.07, 0.07, 0.03, toon(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.06;
  pacifier.add(shield, nipple, ring);
  pacifier.scale.setScalar(scale);
  return pacifier;
}
