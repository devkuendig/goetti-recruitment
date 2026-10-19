import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TorusGeometry,
  type BufferGeometry,
  type MeshToonMaterial,
} from 'three';
import { box, cylinder, GLOW_INTENSITY, sphere, textTexture, toon } from '../engine/build';
import { createWheel } from './carParts';

const BANANA_YELLOW = 0xffd84a;
const BANANA_BROWN = 0x5a4a2a;
const BANANA_RADIUS = 0.11;
const BANANA_THICKNESS = 0.026;
const BANANA_ARC = 1.7;
const TRUCK_CREAM = 0xfff2c0;
const HAZARD_OFF = 0x7a4a10;

let peelGeometry: BufferGeometry | undefined;
let peelMaterial: MeshToonMaterial | undefined;
let tipMaterial: MeshToonMaterial | undefined;

/**
 * One banana (~20 cm), lying as a "smile" along x, lowest point at y = 0.
 * Geometry and materials are shared — a film full of bananas stays cheap.
 */
export function createBanana(): Group {
  if (!peelGeometry) {
    peelGeometry = new TorusGeometry(BANANA_RADIUS, BANANA_THICKNESS, 6, 10, BANANA_ARC);
    peelGeometry.rotateZ(-Math.PI / 2 - BANANA_ARC / 2);
    peelGeometry.translate(0, BANANA_RADIUS + BANANA_THICKNESS, 0);
  }
  peelMaterial ??= toon(BANANA_YELLOW);
  tipMaterial ??= toon(BANANA_BROWN);
  const banana = new Group();
  banana.add(new Mesh(peelGeometry, peelMaterial));
  const endX = Math.sin(BANANA_ARC / 2) * BANANA_RADIUS;
  const endY = BANANA_RADIUS + BANANA_THICKNESS - Math.cos(BANANA_ARC / 2) * BANANA_RADIUS;
  for (const side of [-1, 1]) {
    const tip = sphere(BANANA_THICKNESS * 0.7, tipMaterial);
    tip.position.set(side * endX, endY, 0);
    banana.add(tip);
  }
  return banana;
}

/** An eaten banana: stem plus three floppy flaps. */
export function createBananaPeel(): Group {
  const peel = new Group();
  const material = toon(BANANA_YELLOW);
  const stem = cylinder(0.018, 0.022, 0.06, toon(BANANA_BROWN));
  stem.position.y = 0.05;
  peel.add(stem);
  for (let flap = 0; flap < 3; flap++) {
    const pivot = new Group();
    pivot.rotation.y = (flap * Math.PI * 2) / 3;
    const strip = box(0.045, 0.012, 0.13, material);
    strip.position.set(0, 0.012, 0.065);
    strip.rotation.x = -0.25;
    pivot.add(strip);
    peel.add(pivot);
  }
  return peel;
}

/** Deterministic pseudo-random numbers, so the spilled bananas lie the same way every run. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Bananas strewn over a rectangle on the road (world x/z). `pileHeight` > 0 heaps them
 * into a mound, highest in the middle. Cartoon-sized, so they read from across the street.
 */
export function scatterBananas(
  count: number,
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  seed: number,
  pileHeight = 0,
): Group[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const banana = createBanana();
    const across = random();
    const along = random();
    const mound = Math.sin(across * Math.PI) * Math.sin(along * Math.PI);
    banana.position.set(
      area.minX + across * (area.maxX - area.minX),
      0.02 + mound * pileHeight * random(),
      area.minZ + along * (area.maxZ - area.minZ),
    );
    banana.rotation.set(pileHeight > 0 ? (random() - 0.5) * 1.2 : 0, random() * Math.PI * 2, 0);
    banana.scale.setScalar(ROAD_BANANA_SCALE);
    return banana;
  });
}

const ROAD_BANANA_SCALE = 1.6;

export interface BananaTruck {
  root: Group;
  hazardLights: MeshToonMaterial;
}

/**
 * Delivery truck of "Bananen-Blitz AG", built upright facing -x like every car, then tipped
 * onto its left side (+z side down). Lying there, the cargo box's roof faces +z.
 */
export function createBananaTruck(): BananaTruck {
  const root = new Group();
  const truck = new Group();
  truck.rotation.x = Math.PI / 2;
  truck.position.y = 1.25;
  root.add(truck);

  const cab = box(1.8, 2.2, 2.4, toon(0xd93a2f));
  cab.position.set(-3.3, 1.75, 0);
  const windshield = box(0.05, 0.9, 2.1, toon(0x1d2a3a));
  windshield.position.set(-4.22, 2.2, 0);
  const bumper = box(0.2, 0.3, 2.4, toon(0x3a3a40));
  bumper.position.set(-4.25, 0.75, 0);
  truck.add(cab, windshield, bumper);

  const cargoBox = box(5.8, 3.0, 2.5, toon(TRUCK_CREAM));
  cargoBox.position.set(0.6, 2.4, 0);
  const stripe = box(5.82, 0.35, 2.52, toon(BANANA_YELLOW));
  stripe.position.set(0.6, 1.3, 0);
  const chassis = box(7.6, 0.35, 2.0, toon(0x2a2a30));
  chassis.position.set(-0.6, 0.75, 0);
  truck.add(cargoBox, stripe, chassis);

  // Lettering on the cargo roof — after tipping, that's the side facing the oncoming B05.
  const texture = textTexture('BANANEN-BLITZ AG', {
    width: 1024,
    height: 178,
    font: 'bold 96px "Helvetica Neue", Arial, sans-serif',
    color: '#d93a2f',
    background: '#fff2c0',
  });
  const lettering = new Mesh(new PlaneGeometry(5.2, 0.9), new MeshBasicMaterial({ map: texture }));
  lettering.material.userData.outlineParameters = { visible: false };
  lettering.position.set(0.6, 3.91, 0);
  lettering.rotation.x = -Math.PI / 2;
  truck.add(lettering);

  // Rear doors flung open.
  for (const side of [-1, 1]) {
    const door = new Group();
    door.position.set(3.5, 2.4, side * 1.25);
    const panel = box(0.06, 2.9, 1.25, toon(TRUCK_CREAM));
    panel.position.set(0, 0, -side * 0.62);
    door.add(panel);
    door.rotation.y = side * 1.9;
    truck.add(door);
  }

  const hazardLights = toon(HAZARD_OFF);
  hazardLights.emissiveIntensity = GLOW_INTENSITY;
  for (const x of [-4.22, 3.52]) {
    for (const side of [-1, 1]) {
      const lamp = box(0.08, 0.16, 0.24, hazardLights);
      lamp.position.set(x, 1.0, side * 1.0);
      truck.add(lamp);
    }
  }

  for (const x of [-3.4, 1.0, 2.5]) {
    for (const side of [-1, 1]) {
      const wheel = createWheel({ radius: 0.5, width: 0.3, rimColor: 0xcccccc, spokes: 4 });
      wheel.position.set(x, 0.5, side * 1.1);
      truck.add(wheel);
    }
  }
  return { root, hazardLights };
}

export function setHazardLights(truck: BananaTruck, isOn: boolean): void {
  truck.hazardLights.color.set(isOn ? 0xffb020 : HAZARD_OFF);
  truck.hazardLights.emissive.set(isOn ? 0xff8800 : 0x000000);
}

export interface BananaCargo {
  root: Group;
  /** In loading order: first the boot, then the roof pile layer by layer. All hidden at first. */
  bananas: Group[];
  strap: Group;
}

/**
 * Bananas loaded onto the B05, in the car's local space (faces -x, roof top at y ≈ 1.55).
 * The boot is so full that a few bananas poke out under the raised tailgate.
 */
export function createBananaCargo(): BananaCargo {
  const root = new Group();
  const bananas: Group[] = [];
  const add = (x: number, y: number, z: number, yaw: number, roll = 0) => {
    const banana = createBanana();
    banana.position.set(x, y, z);
    banana.rotation.set(0, yaw, roll);
    banana.visible = false;
    root.add(banana);
    bananas.push(banana);
  };

  for (let index = 0; index < 6; index++) {
    add(2.05 + (index % 2) * 0.08, 1.02 + (index % 3) * 0.04, -0.55 + index * 0.22, Math.PI / 2 + index * 0.4, 0.5);
  }
  const layers = [
    { y: 1.6, columns: 7, rows: 5, spacingX: 0.24, spacingZ: 0.28 },
    { y: 1.72, columns: 5, rows: 3, spacingX: 0.24, spacingZ: 0.28 },
    { y: 1.84, columns: 3, rows: 2, spacingX: 0.24, spacingZ: 0.28 },
  ];
  layers.forEach((layer, layerIndex) => {
    for (let column = 0; column < layer.columns; column++) {
      for (let row = 0; row < layer.rows; row++) {
        const x = 0.25 + (column - (layer.columns - 1) / 2) * layer.spacingX;
        const z = (row - (layer.rows - 1) / 2) * layer.spacingZ;
        add(x, layer.y, z, (column * 1.3 + row * 0.7 + layerIndex) % Math.PI);
      }
    }
  });

  // Red bungee strap over the pile and down both sides to the roof rails.
  const strap = new Group();
  const strapMaterial = toon(0xe2453b);
  const over = box(0.06, 0.03, 1.2, strapMaterial);
  over.position.y = 1.96;
  strap.add(over);
  for (const side of [-1, 1]) {
    const down = box(0.06, 0.03, 0.5, strapMaterial);
    down.position.set(0, 1.76, side * 0.78);
    down.rotation.x = side * 0.75;
    strap.add(down);
  }
  strap.position.x = 0.25;
  strap.visible = false;
  root.add(strap);
  return { root, bananas, strap };
}
