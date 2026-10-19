import { Group, Mesh, PointLight, Vector3, type MeshToonMaterial, type Sprite } from 'three';
import { box, cylinder, GeometryBatch, GLOW_INTENSITY, setOutlineThickness, sphere, toon } from '../engine/build';
import { createBananaPeel } from './bananas';
import { createSparkle } from './b05';
import { createLabel } from './city';

/**
 * Alain's house, Zürcherstrasse 7: a narrow two-storey house at the west end of the near
 * building row. Garage on the ground floor (door onto the street), flat upstairs with a big
 * window looking out over Zürcherstrasse. Walls are separate boxes, so both rooms can be
 * filmed from the inside.
 */
export const HOME = {
  minX: -66,
  maxX: -60,
  frontZ: 10.5,
  backZ: 17.5,
  garageDoorX: -63,
  /** Top of the upstairs floor. */
  flatFloorY: 3.12,
} as const;

/** Look-at points inside the flat and the garage (world space). */
export const HOME_SPOTS = {
  window: new Vector3(-63, 4.6, 10.6),
  gear: new Vector3(-65.2, 3.6, 11.3),
  laptop: new Vector3(-64.3, 3.65, 13.95),
  bowl: new Vector3(-60.55, 4.15, 12.6),
  keyHook: new Vector3(-60.25, 4.5, 15.6),
  /** Tip of the flag pole on the window sill — low enough to be seen through the window. */
  flag: new Vector3(-61.75, 4.65, 9.65),
  car: new Vector3(-63, 0.8, 14),
} as const;

const WALL = 0.2;
const OUTSIDE_PLASTER = 0xf3d9b1;
const GARAGE_LINING = 0xd6d2ca;
const FLAT_LINING = 0xfff1dc;
const FLAT_ACCENT = 0xa8d5c8;
const LINING = 0.02;
const GARAGE_OPENING = { minX: -64.4, maxX: -61.6, minY: 0, maxY: 2.6 };
const WINDOW_OPENING = { minX: -64.6, maxX: -61.4, minY: 3.9, maxY: 5.5 };
const OUTLINE = 0.0022;

export interface Home {
  root: Group;
  /** Roll-up door, pivoting at its top edge: shrink `scale.y` to open it. */
  garageDoor: Group;
  garageLamp: MeshToonMaterial;
  garageLight: PointLight;
  /** Lid hinge of the laptop: `rotation.x = LAPTOP_CLOSED` closed, around -0.25 open. */
  laptopLid: Group;
  fruitFly: Mesh;
  key: Group;
  keySparkle: Sprite;
  /** Swiss flag hanging off the facade; swing it with `rotation.x`. */
  flag: Group;
  clockHand: Group;
}

export const LAPTOP_CLOSED = Math.PI / 2;

type Range = readonly [number, number];

function slab(batch: GeometryBatch, color: number, x: Range, y: Range, z: Range): void {
  batch.box([x[1] - x[0], y[1] - y[0], z[1] - z[0]], color, [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]);
}

/** A wall in the x/y plane spanning the house width, with a rectangular hole. */
function wallWithOpening(
  batch: GeometryBatch,
  color: number,
  y: Range,
  z: Range,
  opening: { minX: number; maxX: number; minY: number; maxY: number },
  x: Range = [HOME.minX, HOME.maxX],
): void {
  if (opening.minY > y[0]) {
    slab(batch, color, x, [y[0], opening.minY], z);
  }
  if (opening.maxY < y[1]) {
    slab(batch, color, x, [opening.maxY, y[1]], z);
  }
  slab(batch, color, [x[0], opening.minX], [opening.minY, opening.maxY], z);
  slab(batch, color, [opening.maxX, x[1]], [opening.minY, opening.maxY], z);
}

export function createHome(): Home {
  const root = new Group();
  const batch = new GeometryBatch();
  const inner = { minX: HOME.minX + WALL, maxX: HOME.maxX - WALL, frontZ: HOME.frontZ + WALL, backZ: HOME.backZ - WALL };
  const fullHeight: Range = [0, 6.3];
  const depth: Range = [HOME.frontZ, HOME.backZ];

  // ── Shell ──────────────────────────────────────────────────────────────────
  slab(batch, OUTSIDE_PLASTER, [HOME.minX, inner.minX], fullHeight, depth);
  slab(batch, OUTSIDE_PLASTER, [inner.maxX, HOME.maxX], fullHeight, depth);
  slab(batch, OUTSIDE_PLASTER, [HOME.minX, HOME.maxX], fullHeight, [inner.backZ, HOME.backZ]);
  wallWithOpening(batch, OUTSIDE_PLASTER, [0, 3.1], [HOME.frontZ, inner.frontZ], GARAGE_OPENING);
  wallWithOpening(batch, OUTSIDE_PLASTER, [3.1, 6.3], [HOME.frontZ, inner.frontZ], WINDOW_OPENING);
  slab(batch, 0xe8e0d0, [inner.minX, inner.maxX], [2.9, 3.1], [inner.frontZ, inner.backZ]);
  slab(batch, 0xc9c2b6, [HOME.minX - 0.2, HOME.maxX + 0.2], [6.3, 6.55], [HOME.frontZ - 0.2, HOME.backZ + 0.2]);
  slab(batch, 0xb8b4ac, [inner.minX, inner.maxX], [0, 0.1], [inner.frontZ, inner.backZ]);

  // ── Inside linings: grey garage, cream flat with a mint back wall ─────────
  const garageHeight: Range = [0.1, 2.9];
  slab(batch, GARAGE_LINING, [inner.minX, inner.minX + LINING], garageHeight, [inner.frontZ, inner.backZ]);
  slab(batch, GARAGE_LINING, [inner.maxX - LINING, inner.maxX], garageHeight, [inner.frontZ, inner.backZ]);
  slab(batch, GARAGE_LINING, [inner.minX, inner.maxX], garageHeight, [inner.backZ - LINING, inner.backZ]);
  wallWithOpening(batch, GARAGE_LINING, garageHeight, [inner.frontZ, inner.frontZ + LINING], GARAGE_OPENING, [inner.minX, inner.maxX]);
  const flatHeight: Range = [HOME.flatFloorY, 6.3];
  slab(batch, FLAT_LINING, [inner.minX, inner.minX + LINING], flatHeight, [inner.frontZ, inner.backZ]);
  slab(batch, FLAT_LINING, [inner.maxX - LINING, inner.maxX], flatHeight, [inner.frontZ, inner.backZ]);
  slab(batch, FLAT_ACCENT, [inner.minX, inner.maxX], flatHeight, [inner.backZ - LINING, inner.backZ]);
  wallWithOpening(batch, FLAT_LINING, flatHeight, [inner.frontZ, inner.frontZ + LINING], WINDOW_OPENING, [inner.minX, inner.maxX]);
  slab(batch, 0xffffff, [inner.minX, inner.maxX], [6.28, 6.3], [inner.frontZ, inner.backZ]);
  slab(batch, 0xc89a6a, [inner.minX, inner.maxX], [3.1, HOME.flatFloorY], [inner.frontZ, inner.backZ]);

  // Window frame with a middle mullion.
  const frameZ: Range = [HOME.frontZ + 0.05, HOME.frontZ + 0.15];
  const { minX, maxX, minY, maxY } = WINDOW_OPENING;
  slab(batch, 0xffffff, [minX, maxX], [minY, minY + 0.06], frameZ);
  slab(batch, 0xffffff, [minX, maxX], [maxY - 0.06, maxY], frameZ);
  slab(batch, 0xffffff, [minX, minX + 0.06], [minY, maxY], frameZ);
  slab(batch, 0xffffff, [maxX - 0.06, maxX], [minY, maxY], frameZ);
  slab(batch, 0xffffff, [-63.03, -62.97], [minY, maxY], frameZ);
  // Window sill and flower box outside.
  slab(batch, 0xe9e2d6, [minX - 0.1, maxX + 0.1], [minY - 0.08, minY], [HOME.frontZ - 0.25, HOME.frontZ + 0.3]);
  slab(batch, 0x8a6a4a, [minX + 0.2, maxX - 0.2], [minY - 0.4, minY - 0.1], [HOME.frontZ - 0.35, HOME.frontZ - 0.08]);
  root.add(batch.build());

  const glassMaterial = toon(0xcfe8f5);
  glassMaterial.transparent = true;
  glassMaterial.opacity = 0.18;
  glassMaterial.userData.outlineParameters = { visible: false };
  const glass = box(maxX - minX, maxY - minY, 0.02, glassMaterial);
  glass.position.set((minX + maxX) / 2, (minY + maxY) / 2, HOME.frontZ + 0.1);
  glass.castShadow = false;
  root.add(glass);
  [0xff6fa5, 0xffd84a, 0xff8a3a, 0xc98aff, 0xffffff, 0xff6fa5, 0xffd84a].forEach((color, index) => {
    const blossom = sphere(0.08, toon(color));
    blossom.position.set(minX + 0.45 + index * 0.38, minY - 0.02, HOME.frontZ - 0.22);
    root.add(blossom);
  });

  const garageDoor = createGarageDoor();
  root.add(garageDoor);
  const flag = createSwissFlag();
  flag.position.copy(HOME_SPOTS.flag);
  root.add(flag, createFlagPole());
  addHouseSigns(root);

  const garage = furnishGarage();
  root.add(garage.root);
  const flat = furnishFlat();
  root.add(flat.root, createOppositeHouse());

  setOutlineThickness(root, OUTLINE);
  return {
    root,
    garageDoor,
    garageLamp: garage.lamp,
    garageLight: garage.light,
    laptopLid: flat.laptopLid,
    fruitFly: flat.fruitFly,
    key: flat.key,
    keySparkle: flat.keySparkle,
    flag,
    clockHand: flat.clockHand,
  };
}

/**
 * The city's far building row starts at x = -60; this is the neighbour across the street from
 * Alain's window, so he doesn't stare into the void.
 */
function createOppositeHouse(): Group {
  const batch = new GeometryBatch();
  const front = -HOME.frontZ;
  const minX = -72;
  const maxX = -60;
  const height = 11;
  slab(batch, 0xd9d4cc, [minX, maxX], [0, height], [front - 8, front]);
  slab(batch, 0xc9c2b6, [minX - 0.1, maxX + 0.1], [height, height + 0.35], [front - 8.1, front + 0.1]);
  for (let floor = 0; floor < 3; floor++) {
    for (let column = 0; column < 5; column++) {
      const x = minX + 1.4 + column * 2.3;
      const y = 1.6 + floor * 3;
      slab(batch, 0xffffff, [x - 0.6, x + 0.6], [y - 0.8, y + 0.8], [front, front + 0.04]);
      slab(batch, (floor + column) % 4 === 0 ? 0xffe9a8 : 0x41618a, [x - 0.5, x + 0.5], [y - 0.7, y + 0.7], [front, front + 0.05]);
      for (const side of [-1, 1]) {
        slab(batch, 0x3f6a4a, [x + side * 0.84 - 0.21, x + side * 0.84 + 0.21], [y - 0.78, y + 0.78], [front, front + 0.06]);
      }
    }
  }
  return batch.build();
}

function createGarageDoor(): Group {
  const door = new Group();
  door.position.set(HOME.garageDoorX, GARAGE_OPENING.maxY, HOME.frontZ + WALL / 2);
  const width = GARAGE_OPENING.maxX - GARAGE_OPENING.minX;
  const height = GARAGE_OPENING.maxY - 0.1;
  const panel = box(width, height, 0.08, toon(0xe9e6df));
  panel.position.y = -height / 2;
  door.add(panel);
  for (let groove = 1; groove < 6; groove++) {
    const line = box(width, 0.03, 0.1, toon(0xbdb8ae));
    line.position.y = -groove * (height / 6);
    door.add(line);
  }
  const handle = box(0.3, 0.05, 0.12, toon(0x5a5a62));
  handle.position.y = -height + 0.25;
  door.add(handle);
  return door;
}

function createFlagPole(): Mesh {
  const pole = cylinder(0.02, 0.02, 1.15, toon(0xcfd3d6));
  const base = new Vector3(HOME_SPOTS.flag.x, WINDOW_OPENING.minY - 0.05, HOME.frontZ - 0.1);
  pole.position.copy(base).lerp(HOME_SPOTS.flag, 0.5);
  pole.lookAt(HOME_SPOTS.flag);
  pole.rotateX(Math.PI / 2);
  return pole;
}

/** Hangs from its pivot (the pole tip) down and back towards the wall. Limp — no wind today. */
function createSwissFlag(): Group {
  const flag = new Group();
  const cloth = new Group();
  cloth.position.set(0, -0.32, 0.3);
  const red = box(0.02, 0.6, 0.6, toon(0xd52b1e));
  const crossBar = box(0.03, 0.12, 0.38, toon(0xffffff));
  const crossPost = box(0.03, 0.38, 0.12, toon(0xffffff));
  cloth.add(red, crossBar, crossPost);
  flag.add(cloth);
  return flag;
}

function addHouseSigns(root: Group): void {
  const number = createLabel('7', 0.32, 0.32, {
    width: 128,
    height: 128,
    font: 'bold 96px "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    background: '#2f5fa5',
  });
  number.position.set(-60.6, 2.3, HOME.frontZ - 0.01);
  number.rotation.y = Math.PI;
  const mailbox = box(0.4, 0.32, 0.16, toon(0xffd200));
  mailbox.position.set(-65.3, 1.15, HOME.frontZ - 0.08);
  const nameplate = createLabel('ALAIN', 0.3, 0.08, {
    width: 256,
    height: 64,
    font: 'bold 44px "Helvetica Neue", Arial, sans-serif',
    color: '#1a1a22',
    background: '#ffffff',
  });
  nameplate.position.set(-65.3, 1.2, HOME.frontZ - 0.17);
  nameplate.rotation.y = Math.PI;
  root.add(number, mailbox, nameplate);
}

function furnishGarage(): { root: Group; lamp: MeshToonMaterial; light: PointLight } {
  const root = new Group();
  const rubber = toon(0x1a1a1e);
  for (let tyre = 0; tyre < 4; tyre++) {
    const stacked = cylinder(0.33, 0.33, 0.22, rubber);
    stacked.position.set(-65.3, 0.21 + tyre * 0.23, 16.7);
    root.add(stacked);
  }
  const bench = box(1.6, 0.08, 0.55, toon(0xb07a4a));
  bench.position.set(-62.6, 0.9, 16.95);
  root.add(bench);
  for (const x of [-63.3, -61.9]) {
    const leg = box(0.06, 0.8, 0.5, toon(0x5a5a62));
    leg.position.set(x, 0.5, 16.95);
    root.add(leg);
  }
  const pegboard = box(1.6, 0.8, 0.02, toon(0xe6d8c3));
  pegboard.position.set(-62.6, 1.65, 17.27);
  root.add(pegboard);
  [0xe2453b, 0x2f5fa5, 0xffc23d, 0x3f8a3a].forEach((color, index) => {
    const tool = box(0.06, 0.32 - index * 0.04, 0.03, toon(color));
    tool.position.set(-63.2 + index * 0.4, 1.65, 17.24);
    tool.rotation.z = (index % 2 === 0 ? 1 : -1) * 0.15;
    root.add(tool);
  });
  for (let can = 0; can < 3; can++) {
    const paint = cylinder(0.1, 0.1, 0.2, toon([0x39c0e0, 0xff7fa8, 0xffffff][can]));
    paint.position.set(-62.0 + can * 0.25, 1.04, 16.95);
    root.add(paint);
  }
  const oilStain = cylinder(0.5, 0.5, 0.005, toon(0x8a867e));
  oilStain.scale.z = 0.6;
  oilStain.position.set(-63, 0.103, 14.2);
  root.add(oilStain);

  // Fluorescent tube: dark until someone hits the switch.
  const lamp = toon(0x9a9a9a);
  lamp.emissiveIntensity = GLOW_INTENSITY;
  const tube = box(1.2, 0.06, 0.1, lamp);
  tube.position.set(-63, 2.84, 14);
  tube.castShadow = false;
  const light = new PointLight(0xf4f8ff, 0, 9, 2);
  light.position.set(-63, 2.5, 14);
  root.add(tube, light);
  return { root, lamp, light };
}

function furnishFlat(): {
  root: Group;
  laptopLid: Group;
  fruitFly: Mesh;
  key: Group;
  keySparkle: Sprite;
  clockHand: Group;
} {
  const root = new Group();
  const floorY = HOME.flatFloorY;

  const rug = box(2.4, 0.01, 1.7, toon(0xd98a6a));
  rug.position.set(-64, floorY + 0.005, 14);
  root.add(rug);

  // Sofa against the left wall, facing the room.
  const upholstery = toon(0x3f6a8a);
  const seat = box(0.8, 0.4, 2.0, upholstery);
  seat.position.set(-65.3, floorY + 0.2, 14);
  const backrest = box(0.25, 0.55, 2.0, upholstery);
  backrest.position.set(-65.65, floorY + 0.65, 14);
  root.add(seat, backrest);
  for (const z of [12.95, 15.05]) {
    const armrest = box(0.8, 0.55, 0.2, upholstery);
    armrest.position.set(-65.3, floorY + 0.3, z);
    root.add(armrest);
  }
  [
    [0xffd84a, 13.5],
    [0xff7fa8, 14.5],
  ].forEach(([color, z]) => {
    const cushion = box(0.15, 0.35, 0.4, toon(color));
    cushion.position.set(-65.45, floorY + 0.58, z);
    cushion.rotation.z = 0.2;
    root.add(cushion);
  });

  // Coffee table with the work laptop, closed — it's Saturday.
  const tableTop = box(0.9, 0.05, 0.6, toon(0xb07a4a));
  tableTop.position.set(-64.3, floorY + 0.42, 14);
  root.add(tableTop);
  for (const [x, z] of [
    [-64.7, 13.75],
    [-63.9, 13.75],
    [-64.7, 14.25],
    [-63.9, 14.25],
  ]) {
    const leg = box(0.04, 0.4, 0.04, toon(0x5a3a22));
    leg.position.set(x, floorY + 0.2, z);
    root.add(leg);
  }
  const laptopBase = box(0.34, 0.02, 0.24, toon(0xb5b8bd));
  laptopBase.position.set(-64.3, floorY + 0.455, 14);
  const laptopLid = new Group();
  laptopLid.position.set(-64.3, floorY + 0.465, 13.88);
  laptopLid.rotation.x = LAPTOP_CLOSED;
  const lidPanel = box(0.34, 0.24, 0.012, toon(0xb5b8bd));
  lidPanel.position.y = 0.12;
  const screen = createLabel('Update 1 von 487 …', 0.31, 0.2, {
    width: 512,
    height: 330,
    font: 'bold 40px "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    background: '#1f5fbf',
  });
  screen.position.set(0, 0.12, 0.007);
  laptopLid.add(lidPanel, screen);
  root.add(laptopBase, laptopLid);

  // Kitchen counter along the right wall; the fruit bowl holds a single peel.
  const counter = box(0.6, 0.9, 2.4, toon(0xf4f4f4));
  counter.position.set(-60.55, floorY + 0.45, 13);
  const worktop = box(0.64, 0.04, 2.44, toon(0xb07a4a));
  worktop.position.set(-60.55, floorY + 0.92, 13);
  const coffeeMachine = box(0.25, 0.35, 0.25, toon(0xe2453b));
  coffeeMachine.position.set(-60.5, floorY + 1.12, 13.9);
  root.add(counter, worktop, coffeeMachine);
  const bowl = sphere(0.15, toon(0x39c0e0));
  bowl.scale.set(1, 0.45, 1);
  bowl.position.set(HOME_SPOTS.bowl.x, floorY + 0.98, HOME_SPOTS.bowl.z);
  const peel = createBananaPeel();
  peel.position.set(HOME_SPOTS.bowl.x, floorY + 1.0, HOME_SPOTS.bowl.z);
  const fruitFly = sphere(0.012, toon(0x1a1a22));
  fruitFly.position.copy(HOME_SPOTS.bowl);
  root.add(bowl, peel, fruitFly);

  // Key hook by the flat door.
  const door = box(0.04, 2.1, 0.9, toon(0xb07a4a));
  door.position.set(-60.21, floorY + 1.05, 16.6);
  const doorHandle = box(0.06, 0.03, 0.14, toon(0xcfd3d6));
  doorHandle.position.set(-60.25, floorY + 1.0, 16.3);
  const hookBoard = box(0.03, 0.12, 0.35, toon(0x8a5a3c));
  hookBoard.position.set(-60.22, HOME_SPOTS.keyHook.y + 0.05, HOME_SPOTS.keyHook.z);
  root.add(door, doorHandle, hookBoard);
  const key = new Group();
  key.position.set(-60.27, HOME_SPOTS.keyHook.y - 0.05, HOME_SPOTS.keyHook.z);
  const fob = box(0.03, 0.08, 0.045, toon(0x1a1a22));
  const ring = cylinder(0.018, 0.018, 0.005, toon(0xcfcfcf));
  ring.rotation.z = Math.PI / 2;
  ring.position.y = 0.05;
  const keySparkle = createSparkle();
  keySparkle.position.set(-0.03, 0.02, 0);
  key.add(fob, ring, keySparkle);
  root.add(key);

  // Paraglider gear in the corner by the window.
  const pack = box(0.5, 0.65, 0.35, toon(0xff6a2a));
  pack.position.set(HOME_SPOTS.gear.x, floorY + 0.33, HOME_SPOTS.gear.z);
  const packStripe = box(0.52, 0.08, 0.37, toon(0x39c0e0));
  packStripe.position.set(HOME_SPOTS.gear.x, floorY + 0.45, HOME_SPOTS.gear.z);
  const helmet = sphere(0.15, toon(0xffd84a));
  helmet.scale.set(1, 0.8, 1.1);
  helmet.position.set(HOME_SPOTS.gear.x + 0.25, floorY + 0.12, HOME_SPOTS.gear.z + 0.5);
  root.add(pack, packStripe, helmet);

  // Back wall: clock and a framed photo of the beloved B05.
  const clockFace = cylinder(0.25, 0.25, 0.04, toon(0xffffff));
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(-62.6, 5.5, 17.26);
  const clockHand = new Group();
  clockHand.position.set(-62.6, 5.5, 17.23);
  const secondHand = box(0.015, 0.2, 0.01, toon(0xd52b1e));
  secondHand.position.y = 0.09;
  clockHand.add(secondHand);
  const photo = createLabel('B05 ♥', 0.7, 0.5, {
    width: 280,
    height: 200,
    font: 'bold 64px "Comic Sans MS", "Comic Neue", sans-serif',
    color: '#ffffff',
    background: '#2f7fe0',
  });
  photo.position.set(-64.4, 4.8, 17.26);
  photo.rotation.y = Math.PI;
  const photoFrame = box(0.8, 0.6, 0.03, toon(0x1a1a22));
  photoFrame.position.set(-64.4, 4.8, 17.28);
  const calendar = createLabel('SAMSTAG', 0.5, 0.35, {
    width: 256,
    height: 180,
    font: 'bold 48px "Helvetica Neue", Arial, sans-serif',
    color: '#d52b1e',
    background: '#ffffff',
  });
  calendar.position.set(-65.77, 4.9, 11.9);
  calendar.rotation.y = Math.PI / 2;
  root.add(clockFace, clockHand, photoFrame, photo, calendar);

  const pot = cylinder(0.18, 0.14, 0.35, toon(0xb5473a));
  pot.position.set(-60.7, floorY + 0.17, 11.1);
  const leaves = sphere(0.35, toon(0x5aaa60));
  leaves.position.set(-60.7, floorY + 0.65, 11.1);
  root.add(pot, leaves);

  const ceilingLamp = sphere(0.18, toon(0xfff3b0, 0x8a7a40));
  ceilingLamp.position.set(-63, 6.0, 14);
  const light = new PointLight(0xfff0d8, 3.5, 10, 2);
  light.position.set(-63, 5.2, 14);
  root.add(ceilingLamp, light);
  return { root, laptopLid, fruitFly, key, keySparkle, clockHand };
}
