import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  type MeshToonMaterial,
  type Sprite,
} from 'three';
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
  /** Recipe book and empty loaf tin on the worktop. */
  baking: new Vector3(-60.55, 4.15, 13.3),
  /** Oven built into the kitchen counter, under the baking things. */
  oven: new Vector3(-60.86, 3.55, 13.3),
  keyHook: new Vector3(-60.25, 4.5, 15.6),
  /** Barista machine on the worktop and the hot cup in front of it (top of the coffee). */
  barista: new Vector3(-60.5, 4.3, 14.5),
  coffeeCup: new Vector3(-60.68, 4.15, 13.95),
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
  bowlNote: Mesh;
  key: Group;
  keySparkle: Sprite;
  /** Swiss flag hanging off the facade; swing it with `rotation.x`. */
  flag: Group;
  clockHand: Group;
  /** Oven light: glows (emissive) once he switches the oven on. */
  ovenLamp: MeshToonMaterial;
  /** Model paraglider hanging from the ceiling; origin at the ceiling hook. */
  modelGlider: Group;
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
    bowlNote: flat.bowlNote,
    key: flat.key,
    keySparkle: flat.keySparkle,
    flag,
    clockHand: flat.clockHand,
    ovenLamp: flat.ovenLamp,
    modelGlider: flat.modelGlider,
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

const WING_ORANGE = 0xff6a2a;
const WING_BLUE = 0x2f6fd8;
const STRAP_BLACK = 0x222228;

/**
 * Packed paraglider: a tall, rounded rucksack standing on the floor, front (+x) into the room,
 * shoulder straps against the wall. Origin at its foot.
 */
function createParagliderPack(): Group {
  const pack = new Group();
  const fabric = toon(WING_ORANGE);
  const strap = toon(STRAP_BLACK);
  const body = box(0.36, 0.72, 0.5, fabric);
  body.position.y = 0.36;
  const top = sphere(0.25, fabric);
  top.scale.set(0.72, 0.42, 1);
  top.position.y = 0.72;
  const pocket = box(0.06, 0.32, 0.38, toon(0xd9541f));
  pocket.position.set(0.2, 0.3, 0);
  const band = box(0.37, 0.07, 0.51, toon(WING_BLUE));
  band.position.y = 0.56;
  pack.add(body, top, pocket, band);
  // Compression straps round the pack, each with a buckle on the front.
  for (const y of [0.18, 0.42, 0.66]) {
    const compression = box(0.37, 0.03, 0.51, strap);
    compression.position.y = y;
    const buckle = box(0.03, 0.05, 0.06, toon(0xb5b8bd));
    buckle.position.set(0.235, y, 0.1);
    pack.add(compression, buckle);
  }
  // Padded shoulder straps and a waist belt on the back.
  for (const side of [-1, 1]) {
    const shoulder = box(0.05, 0.5, 0.07, strap);
    shoulder.position.set(-0.2, 0.42, side * 0.13);
    pack.add(shoulder);
  }
  const waistBelt = box(0.05, 0.08, 0.5, strap);
  waistBelt.position.set(-0.2, 0.12, 0);
  // Carabiner dangling from the side, glider brand on the pocket.
  const carabiner = new Mesh(new TorusGeometry(0.035, 0.008, 6, 14), toon(0xcfd3d6));
  carabiner.position.set(0.05, 0.5, 0.27);
  const brand = createLabel('ALPEN-AIR', 0.34, 0.08, {
    width: 256,
    height: 60,
    font: 'bold 40px "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    background: '#d9541f',
  });
  brand.position.set(0.234, 0.38, 0);
  brand.rotation.y = Math.PI / 2;
  pack.add(waistBelt, carabiner, brand);
  return pack;
}

/**
 * Everything ready for banana bread except the bananas: an oven built into the counter, and on the
 * worktop the open recipe book, an empty loaf tin, flour, sugar and a mixing bowl with a whisk.
 */
const STEEL = 0xcfd3d6;
const ESPRESSO_RED = 0xd52b1e;

/** White cup with a saucer; the coffee surface sits at the cup's top. */
function createCoffeeCup(): Group {
  const cup = new Group();
  const saucer = cylinder(0.075, 0.06, 0.012, toon(0xffffff));
  saucer.position.y = 0.006;
  const body = cylinder(0.045, 0.034, 0.07, toon(0xffffff));
  body.position.y = 0.047;
  const coffee = cylinder(0.04, 0.04, 0.005, toon(0x6b3a1e));
  coffee.position.y = 0.08;
  const crema = cylinder(0.022, 0.022, 0.006, toon(0xc98a4a));
  crema.position.y = 0.082;
  const handle = new Mesh(new TorusGeometry(0.02, 0.006, 8, 16), toon(0xffffff));
  handle.position.set(0, 0.05, 0.05);
  handle.rotation.y = Math.PI / 2;
  cup.add(saucer, body, coffee, crema, handle);
  return cup;
}

/**
 * Portafilter espresso machine facing into the room (-x): steel body with a red side panel,
 * pressure gauge, group head with portafilter, steam wand, drip tray with a cup, cups warming on top.
 * The hot cup in front of it sits at `HOME_SPOTS.coffeeCup`.
 */
function createBaristaMachine(worktopY: number): Group {
  const root = new Group();
  const { x, z } = HOME_SPOTS.barista;
  const frontX = x - 0.22;
  const body = box(0.44, 0.42, 0.52, toon(STEEL));
  body.position.set(x, worktopY + 0.21, z);
  const sidePanels = [-1, 1].map((side) => {
    const panel = box(0.4, 0.3, 0.01, toon(ESPRESSO_RED));
    panel.position.set(x, worktopY + 0.24, z + side * 0.265);
    return panel;
  });
  const gauge = cylinder(0.045, 0.045, 0.02, toon(0xffffff));
  gauge.rotation.z = Math.PI / 2;
  gauge.position.set(frontX - 0.01, worktopY + 0.34, z);
  const needle = box(0.005, 0.035, 0.006, toon(ESPRESSO_RED));
  needle.position.set(frontX - 0.022, worktopY + 0.35, z + 0.008);
  needle.rotation.x = -0.6;
  const groupHead = cylinder(0.05, 0.045, 0.07, toon(0x9a9aa2));
  groupHead.position.set(frontX - 0.06, worktopY + 0.24, z - 0.08);
  const portafilter = cylinder(0.042, 0.042, 0.04, toon(0x9a9aa2));
  portafilter.position.set(frontX - 0.06, worktopY + 0.19, z - 0.08);
  const portafilterHandle = box(0.16, 0.03, 0.035, toon(0x1a1a22));
  portafilterHandle.position.set(frontX - 0.17, worktopY + 0.19, z - 0.08);
  const steamWand = cylinder(0.007, 0.007, 0.22, toon(STEEL));
  steamWand.position.set(frontX - 0.05, worktopY + 0.2, z + 0.17);
  steamWand.rotation.z = 0.25;
  const steamKnob = sphere(0.022, toon(0x1a1a22));
  steamKnob.position.set(frontX - 0.02, worktopY + 0.34, z + 0.17);
  const dripTray = box(0.14, 0.03, 0.4, toon(0x5a5a62));
  dripTray.position.set(frontX - 0.07, worktopY + 0.015, z);
  const shotCup = createCoffeeCup();
  shotCup.position.set(frontX - 0.06, worktopY + 0.03, z - 0.08);
  root.add(body, ...sidePanels, gauge, needle, groupHead, portafilter, portafilterHandle, steamWand, steamKnob, dripTray, shotCup);
  for (const offset of [-0.14, 0, 0.14]) {
    const warmingCup = cylinder(0.04, 0.032, 0.06, toon(0xffffff));
    warmingCup.rotation.x = Math.PI;
    warmingCup.position.set(x + 0.02, worktopY + 0.45, z + offset);
    root.add(warmingCup);
  }
  const heroCup = createCoffeeCup();
  heroCup.position.set(HOME_SPOTS.coffeeCup.x, worktopY, HOME_SPOTS.coffeeCup.z);
  root.add(heroCup);
  return root;
}

/** Open shelf above the worktop with a row of colourful mugs and a jar of beans. */
function createCupShelf(floorY: number): Group {
  const root = new Group();
  const shelfY = floorY + 1.75;
  const shelf = box(0.28, 0.04, 1.8, toon(0xb07a4a));
  shelf.position.set(-60.36, shelfY, 13.9);
  root.add(shelf);
  [0xe2453b, 0xffd84a, 0x39c0e0, 0x6cc070, 0xff7fa8, 0xffffff].forEach((color, index) => {
    const mug = cylinder(0.045, 0.045, 0.1, toon(color));
    mug.position.set(-60.38, shelfY + 0.07, 13.15 + index * 0.22);
    root.add(mug);
  });
  const beans = cylinder(0.06, 0.06, 0.16, toon(0x4a2a14));
  beans.position.set(-60.38, shelfY + 0.1, 14.6);
  const lid = cylinder(0.065, 0.065, 0.03, toon(STEEL));
  lid.position.set(-60.38, shelfY + 0.195, 14.6);
  root.add(beans, lid);
  return root;
}

function createBakingCorner(floorY: number): { root: Group; ovenLamp: MeshToonMaterial } {
  const root = new Group();
  const worktopY = floorY + 0.94;
  const counterFrontX = -60.86;
  // Oven: steel front, dark glass door, handle, two knobs, a light inside.
  const ovenFront = box(0.02, 0.6, 0.58, toon(0xb5b8bd));
  ovenFront.position.set(counterFrontX, floorY + 0.45, HOME_SPOTS.oven.z);
  const ovenGlass = box(0.02, 0.32, 0.44, toon(0x2a2a30));
  ovenGlass.position.set(counterFrontX - 0.005, floorY + 0.4, HOME_SPOTS.oven.z);
  const ovenHandle = box(0.03, 0.03, 0.42, toon(0xe8e8e8));
  ovenHandle.position.set(counterFrontX - 0.03, floorY + 0.6, HOME_SPOTS.oven.z);
  const ovenLamp = toon(0x3a2a10);
  ovenLamp.emissiveIntensity = GLOW_INTENSITY;
  const ovenLight = box(0.01, 0.06, 0.2, ovenLamp);
  ovenLight.position.set(counterFrontX - 0.012, floorY + 0.5, HOME_SPOTS.oven.z);
  root.add(ovenFront, ovenGlass, ovenHandle, ovenLight);
  for (const offset of [-0.18, 0.18]) {
    const knob = cylinder(0.025, 0.025, 0.03, toon(0x1a1a22));
    knob.rotation.z = Math.PI / 2;
    knob.position.set(counterFrontX - 0.02, floorY + 0.7, HOME_SPOTS.oven.z + offset);
    root.add(knob);
  }

  // Open recipe book propped against the wall.
  const recipe = createLabel('BANANENBROT', 0.3, 0.2, {
    width: 300,
    height: 200,
    font: 'bold 40px "Comic Sans MS", "Comic Neue", sans-serif',
    color: '#7a4a1e',
    background: '#fff6dc',
  });
  recipe.position.set(-60.3, worktopY + 0.12, HOME_SPOTS.baking.z + 0.25);
  recipe.rotation.set(0, -Math.PI / 2, -0.25);
  // Empty loaf tin, flour and sugar packs, mixing bowl with a whisk.
  const tin = box(0.26, 0.08, 0.12, toon(0x9a9aa2));
  tin.position.set(-60.6, worktopY + 0.04, HOME_SPOTS.baking.z - 0.1);
  const tinInside = box(0.23, 0.01, 0.09, toon(0x3a3a40));
  tinInside.position.set(-60.6, worktopY + 0.081, HOME_SPOTS.baking.z - 0.1);
  const flour = createLabel('MEHL', 0.1, 0.06, {
    width: 120,
    height: 70,
    font: 'bold 40px "Helvetica Neue", Arial, sans-serif',
    color: '#2f5fa5',
    background: '#ffffff',
  });
  const flourBag = box(0.1, 0.18, 0.07, toon(0xffffff));
  flourBag.position.set(-60.45, worktopY + 0.09, HOME_SPOTS.baking.z - 1.1);
  flour.position.set(-60.505, worktopY + 0.1, HOME_SPOTS.baking.z - 1.1);
  flour.rotation.y = -Math.PI / 2;
  const sugar = box(0.08, 0.13, 0.06, toon(0xff8fb1));
  sugar.position.set(-60.42, worktopY + 0.065, HOME_SPOTS.baking.z - 1.25);
  const mixingBowl = sphere(0.12, toon(0xffffff));
  mixingBowl.scale.set(1, 0.55, 1);
  mixingBowl.position.set(-60.6, worktopY + 0.05, HOME_SPOTS.baking.z - 0.35);
  const whisk = cylinder(0.008, 0.008, 0.26, toon(0xcfd3d6));
  whisk.position.set(-60.62, worktopY + 0.15, HOME_SPOTS.baking.z - 0.35);
  whisk.rotation.z = 0.5;
  root.add(recipe, tin, tinInside, flourBag, flour, sugar, mixingBowl, whisk);
  return { root, ovenLamp };
}

/**
 * Framed holiday photo: Alain under his orange wing above Amden, Walensee and the Churfirsten
 * below. Painted on a canvas, facing +z.
 */
function createParaglidingPhoto(): Mesh {
  const width = 512;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context unavailable — cannot paint the paragliding photo');
  }
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#3f9be8');
  sky.addColorStop(1, '#cfeaff');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  // Churfirsten: jagged grey peaks with snow caps, the Walensee below, green slopes in front.
  context.fillStyle = '#8a93a0';
  context.beginPath();
  context.moveTo(0, 230);
  [[60, 150], [110, 190], [170, 135], [230, 185], [290, 140], [350, 190], [410, 150], [470, 185], [512, 165], [512, 240]].forEach(
    ([x, y]) => context.lineTo(x, y),
  );
  context.lineTo(0, 240);
  context.fill();
  context.fillStyle = '#ffffff';
  for (const [x, y] of [[60, 150], [170, 135], [290, 140], [410, 150]]) {
    context.beginPath();
    context.moveTo(x - 18, y + 16);
    context.lineTo(x, y);
    context.lineTo(x + 18, y + 16);
    context.fill();
  }
  context.fillStyle = '#2f7fb8';
  context.fillRect(0, 232, width, 34);
  context.fillStyle = '#5aaa60';
  context.beginPath();
  context.moveTo(0, 266);
  context.quadraticCurveTo(260, 245, 512, 275);
  context.lineTo(512, height);
  context.lineTo(0, height);
  context.fill();
  // The wing: an orange-and-white arc of cells, lines down to a tiny pilot.
  const wingCenterX = 320;
  const wingTopY = 60;
  for (let cell = -4; cell <= 4; cell++) {
    const angle = cell * 0.17;
    context.save();
    context.translate(wingCenterX + Math.sin(angle) * 90, wingTopY + (1 - Math.cos(angle)) * 90);
    context.rotate(angle);
    context.fillStyle = cell % 2 === 0 ? '#ff6a2a' : '#ffffff';
    context.fillRect(-11, -9, 22, 18);
    context.restore();
  }
  const pilotY = wingTopY + 95;
  context.strokeStyle = '#555555';
  context.lineWidth = 1;
  for (const cell of [-4, -2, 0, 2, 4]) {
    const angle = cell * 0.17;
    context.beginPath();
    context.moveTo(wingCenterX + Math.sin(angle) * 90, wingTopY + (1 - Math.cos(angle)) * 90 + 9);
    context.lineTo(wingCenterX, pilotY);
    context.stroke();
  }
  context.fillStyle = '#222228';
  context.fillRect(wingCenterX - 6, pilotY, 12, 10);
  context.fillStyle = '#ffd84a';
  context.beginPath();
  context.arc(wingCenterX, pilotY - 4, 5, 0, Math.PI * 2);
  context.fill();
  context.font = 'bold 34px "Helvetica Neue", Arial, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText('AMDEN 1700 m', 18, 44);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const photo = new Mesh(new PlaneGeometry(0.84, 0.54), new MeshBasicMaterial({ map: texture }));
  photo.material.userData.outlineParameters = { visible: false };
  return photo;
}

/** Open-face flying helmet with a tinted visor and a sticker. Origin at its rim. */
function createParaglidingHelmet(): Group {
  const helmet = new Group();
  const shell = sphere(0.15, toon(0xffd84a));
  shell.scale.set(1, 0.85, 1.15);
  shell.position.y = 0.1;
  const visor = box(0.2, 0.06, 0.03, toon(0x3a4a5a));
  visor.position.set(0, 0.07, 0.17);
  visor.rotation.x = 0.3;
  const sticker = sphere(0.04, toon(WING_BLUE));
  sticker.scale.set(1, 1, 0.2);
  sticker.position.set(0.11, 0.16, 0.06);
  sticker.rotation.y = 1;
  helmet.add(shell, visor, sticker);
  return helmet;
}

/** Little model paraglider hanging from the ceiling: arched wing, lines, a tiny pilot. */
function createModelGlider(): Group {
  const glider = new Group();
  const hanger = cylinder(0.004, 0.004, 0.25, toon(0xffffff));
  hanger.position.y = -0.125;
  glider.add(hanger);
  const wingRadius = 0.5;
  const wingTop = -0.25;
  const pilot = new Vector3(0, wingTop - 0.55, 0);
  const lineMaterial = toon(0xdddddd);
  for (let cell = -4; cell <= 4; cell++) {
    const angle = cell * 0.17;
    const cellX = Math.sin(angle) * wingRadius;
    const cellY = wingTop + (Math.cos(angle) - 1) * wingRadius;
    const wingCell = box(0.11, 0.035, 0.22, toon([WING_ORANGE, 0xffffff, WING_BLUE][(cell + 4) % 3]));
    wingCell.position.set(cellX, cellY, 0);
    wingCell.rotation.z = -angle;
    glider.add(wingCell);
    if (cell % 2 === 0) {
      // A line from the cell down to the pilot.
      const deltaX = pilot.x - cellX;
      const deltaY = pilot.y - cellY;
      const line = cylinder(0.002, 0.002, Math.hypot(deltaX, deltaY), lineMaterial);
      line.position.set((cellX + pilot.x) / 2, (cellY + pilot.y) / 2, 0);
      line.rotation.z = Math.atan2(-deltaX, deltaY);
      glider.add(line);
    }
  }
  const harness = box(0.05, 0.05, 0.07, toon(STRAP_BLACK));
  harness.position.copy(pilot);
  const pilotHead = sphere(0.02, toon(0xffd84a));
  pilotHead.position.set(pilot.x, pilot.y + 0.045, pilot.z);
  glider.add(harness, pilotHead);
  return glider;
}

function furnishFlat(): {
  root: Group;
  laptopLid: Group;
  bowlNote: Mesh;
  key: Group;
  keySparkle: Sprite;
  clockHand: Group;
  ovenLamp: MeshToonMaterial;
  modelGlider: Group;
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
  const screen = createLabel('Update 1 vo 487 …', 0.31, 0.2, {
    width: 512,
    height: 330,
    font: 'bold 40px "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    background: '#1f5fbf',
  });
  screen.position.set(0, 0.12, 0.007);
  laptopLid.add(lidPanel, screen);
  root.add(laptopBase, laptopLid);

  // Generous kitchen counter along the right wall, with the barista machine and a shelf of cups;
  // the fruit bowl holds a single peel and a guilty note.
  const counter = box(0.6, 0.9, 4.0, toon(0xf4f4f4));
  counter.position.set(-60.55, floorY + 0.45, 13);
  const worktop = box(0.64, 0.04, 4.04, toon(0xb07a4a));
  worktop.position.set(-60.55, floorY + 0.92, 13);
  root.add(counter, worktop, createBaristaMachine(floorY + 0.94), createCupShelf(floorY));
  const bowl = sphere(0.15, toon(0x39c0e0));
  bowl.scale.set(1, 0.45, 1);
  bowl.position.set(HOME_SPOTS.bowl.x, floorY + 0.98, HOME_SPOTS.bowl.z);
  const peel = createBananaPeel();
  peel.position.set(HOME_SPOTS.bowl.x, floorY + 1.0, HOME_SPOTS.bowl.z);
  const bowlNote = createLabel('Sälber gässe 😋', 0.18, 0.1, {
    width: 360,
    height: 200,
    font: 'bold 44px "Comic Sans MS", "Comic Neue", sans-serif',
    color: '#1a1a22',
    background: '#fff6a0',
  });
  bowlNote.position.set(HOME_SPOTS.bowl.x - 0.06, floorY + 1.08, HOME_SPOTS.bowl.z + 0.04);
  bowlNote.rotation.set(0, -Math.PI / 2, -0.2);
  root.add(bowl, peel, bowlNote);
  const baking = createBakingCorner(floorY);
  root.add(baking.root);

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

  // Paraglider corner by the window: packed wing, helmet, a model glider and a souvenir poster.
  const pack = createParagliderPack();
  pack.position.set(HOME_SPOTS.gear.x, floorY, HOME_SPOTS.gear.z);
  const helmet = createParaglidingHelmet();
  helmet.position.set(HOME_SPOTS.gear.x + 0.35, floorY, HOME_SPOTS.gear.z + 0.45);
  helmet.rotation.y = -0.6;
  const modelGlider = createModelGlider();
  modelGlider.position.set(-64.2, 6.3, 12.2);
  const paraglidingPhoto = createParaglidingPhoto();
  paraglidingPhoto.position.set(-65.75, 5.0, 14);
  paraglidingPhoto.rotation.y = Math.PI / 2;
  const photoBackFrame = box(0.02, 0.62, 0.92, toon(0x5a3a22));
  photoBackFrame.position.set(-65.77, 5.0, 14);
  root.add(pack, helmet, modelGlider, photoBackFrame, paraglidingPhoto);

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
  return { root, laptopLid, bowlNote, key, keySparkle, clockHand, ovenLamp: baking.ovenLamp, modelGlider };
}
