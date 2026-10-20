import { Group, MathUtils, Mesh, TorusGeometry, Vector3, type MeshToonMaterial, type Object3D } from 'three';
import { box, cylinder, GLOW_INTENSITY, sphere, toon } from '../engine/build';
import { createBike } from './streetFurniture';
import { createPacifier } from './tunedCar';

const SKIN = 0xf5c9a0;
const INK = 0x1a1a22;

/** All characters face +z in local space; rotate the root to point them elsewhere. */

export interface Kid {
  root: Group;
  head: Group;
  wavingArm: Group;
  whistleMouth: Mesh;
  glintAnchor: Group;
  pacifier: Group;
  /** Big round eyes; scale them up for wonder, squash them for a squint. */
  eyes: [Group, Group];
  /** Raised for curiosity: tilt with `rotation.z`, lift with `position.y`. */
  brows: [Mesh, Mesh];
}

const KID_HEAD_RADIUS = 0.21;
export const KID_PACIFIER_IN_MOUTH = new Vector3(0, -0.1, 0.24);

export function createKid(): Kid {
  const root = new Group();
  const skin = toon(SKIN);

  ['#ff8fb1', '#8fd3ff', '#ffe08f'].forEach((color, index) => {
    const pillow = box(0.42, 0.07, 0.38, toon(color));
    pillow.position.y = 0.035 + index * 0.07;
    root.add(pillow);
  });

  // Pastel-yellow romper with polka dots and a bib with a red heart.
  const torso = box(0.26, 0.3, 0.18, toon(0xfff0a0));
  torso.position.set(0, 0.36, 0.22);
  torso.rotation.x = 0.55;
  const bib = box(0.16, 0.14, 0.02, toon(0xffffff));
  bib.position.set(0, 0.42, 0.33);
  bib.rotation.x = 0.55;
  const heart = sphere(0.025, toon(0xff4f6a));
  heart.scale.set(1.2, 1, 0.4);
  heart.position.set(0, 0.42, 0.345);
  root.add(torso, bib, heart);
  [[-0.08, 0.3], [0.09, 0.27], [0.06, 0.38], [-0.1, 0.4]].forEach(([x, y]) => {
    const dot = sphere(0.015, toon(0x8fd3ff));
    dot.scale.set(1, 1, 0.4);
    dot.position.set(x, y, 0.23 + (y - 0.25) * 0.6);
    root.add(dot);
  });

  // Oversized baby head.
  const head = new Group();
  head.position.set(0, 0.55, 0.5);
  root.add(head);
  head.add(sphere(KID_HEAD_RADIUS, skin));
  for (const side of [-1, 1]) {
    const ear = sphere(0.05, skin);
    ear.position.set(side * KID_HEAD_RADIUS, 0, 0);
    const blush = sphere(0.035, toon(0xff9a9a));
    blush.position.set(side * 0.12, -0.05, 0.16);
    blush.scale.set(1, 0.6, 0.4);
    head.add(ear, blush);
  }
  const nose = sphere(0.022, skin);
  nose.position.set(0, -0.02, 0.205);
  head.add(nose);
  // A soft curl on top and a few wisps — a happy little haystack.
  const hairMaterial = toon(0xc98a3a);
  const curl = new Mesh(new TorusGeometry(0.035, 0.012, 6, 14, Math.PI * 1.5), hairMaterial);
  curl.position.set(0.02, KID_HEAD_RADIUS + 0.02, 0.05);
  curl.rotation.set(0, Math.PI / 2, 0.4);
  head.add(curl);
  [-0.06, 0.06].forEach((x) => {
    const wisp = cylinder(0.01, 0.004, 0.07, hairMaterial);
    wisp.position.set(x, KID_HEAD_RADIUS - 0.005, 0.02);
    wisp.rotation.z = -x * 6;
    head.add(wisp);
  });

  const eyes = [-1, 1].map((side) => {
    const eye = new Group();
    eye.position.set(side * 0.075, 0.04, 0.165);
    const white = sphere(0.045, toon(0xffffff));
    white.scale.set(1, 1.15, 0.8);
    const iris = sphere(0.03, toon(0x6a4a2a));
    iris.position.set(0, -0.005, 0.025);
    const pupil = sphere(0.018, toon(INK));
    pupil.position.set(0, -0.005, 0.04);
    const highlight = sphere(0.009, toon(0xffffff));
    highlight.position.set(0.01, 0.012, 0.055);
    eye.add(white, iris, pupil, highlight);
    head.add(eye);
    return eye;
  }) as [Group, Group];
  // Brows raised high — everything is interesting.
  const brows = [-1, 1].map((side) => {
    const brow = box(0.05, 0.01, 0.01, hairMaterial);
    brow.position.set(side * 0.075, 0.115, 0.18);
    brow.rotation.z = side * -0.25;
    head.add(brow);
    return brow;
  }) as [Mesh, Mesh];
  const glintAnchor = new Group();
  glintAnchor.position.set(0.1, 0.06, 0.22);
  head.add(glintAnchor);

  const whistleMouth = sphere(0.025, toon(0x9b2d3a));
  whistleMouth.position.set(0, -0.1, 0.195);
  whistleMouth.scale.set(1.4, 0.4, 0.6);
  head.add(whistleMouth);

  const pacifier = createPacifier(0x22c7e8, 1.1);
  pacifier.position.copy(KID_PACIFIER_IN_MOUTH);
  head.add(pacifier);

  const wavingArm = new Group();
  wavingArm.position.set(0.16, 0.45, 0.3);
  wavingArm.rotation.x = 0.9;
  const forearm = cylinder(0.035, 0.035, 0.3, skin);
  forearm.position.y = 0.15;
  const hand = sphere(0.05, skin);
  hand.position.y = 0.32;
  wavingArm.add(forearm, hand);
  root.add(wavingArm);

  // Inside the car the roof would shade the kid into a dark blob — keep it lit.
  root.traverse((node) => {
    node.receiveShadow = false;
  });

  return { root, head, wavingArm, whistleMouth, glintAnchor, pacifier, eyes, brows };
}

export interface Pram {
  root: Group;
  /** Put the kid's root in here; it sits facing the pram's front (+z). */
  seat: Group;
  wheels: Group[];
}

/** Navy pram with a folding hood at the back and the push handle behind it. Faces +z. */
export function createPram(): Pram {
  const root = new Group();
  const fabric = toon(0x2f4f7f);
  const metal = toon(0xcfd3d6);
  const tub = box(0.5, 0.32, 0.8, fabric);
  tub.position.set(0, 0.62, 0);
  const trim = box(0.52, 0.04, 0.82, toon(0xffffff));
  trim.position.set(0, 0.79, 0);
  const hood = sphere(0.3, fabric);
  hood.scale.set(0.9, 0.85, 0.8);
  hood.position.set(0, 0.8, -0.32);
  const frame = box(0.04, 0.04, 0.9, metal);
  frame.position.set(0, 0.36, 0);
  const handlePost = box(0.04, 0.7, 0.04, metal);
  handlePost.position.set(0, 0.9, -0.6);
  handlePost.rotation.x = -0.45;
  const handle = cylinder(0.025, 0.025, 0.5, toon(0x1a1a22));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 1.2, -0.75);
  root.add(tub, trim, hood, frame, handlePost, handle);
  const wheels = [-0.32, 0.32].flatMap((z) =>
    [-1, 1].map((side) => {
      const wheel = new Group();
      wheel.position.set(side * 0.27, 0.15, z);
      const tyre = cylinder(0.15, 0.15, 0.05, toon(0x1a1a22));
      tyre.rotation.z = Math.PI / 2;
      const hub = cylinder(0.05, 0.05, 0.06, metal);
      hub.rotation.z = Math.PI / 2;
      wheel.add(tyre, hub);
      root.add(wheel);
      return wheel;
    }),
  );
  const seat = new Group();
  seat.position.set(0, 0.5, -0.12);
  seat.scale.setScalar(0.85);
  root.add(seat);
  return { root, seat, wheels };
}

/** Rollator for the grandma, with a shopping basket (a Zopf and a leek sticking out). Faces +z. */
export function createRollator(): Group {
  const rollator = new Group();
  const frame = toon(0xb5473a);
  for (const side of [-1, 1]) {
    const post = box(0.03, 0.85, 0.03, frame);
    post.position.set(side * 0.24, 0.45, -0.05);
    post.rotation.x = 0.12;
    const grip = cylinder(0.022, 0.022, 0.12, toon(0x1a1a22));
    grip.rotation.x = Math.PI / 2;
    grip.position.set(side * 0.24, 0.88, -0.12);
    rollator.add(post, grip);
    for (const z of [-0.12, 0.28]) {
      const wheel = cylinder(0.08, 0.08, 0.03, toon(0x1a1a22));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.24, 0.08, z);
      rollator.add(wheel);
    }
  }
  const basket = box(0.42, 0.2, 0.3, toon(0x8a6a4a));
  basket.position.set(0, 0.55, 0.08);
  const zopf = sphere(0.09, toon(0xd9a05a));
  zopf.scale.set(1.6, 0.8, 0.9);
  zopf.position.set(-0.06, 0.68, 0.08);
  const leek = cylinder(0.025, 0.03, 0.4, toon(0xeef2d0));
  leek.position.set(0.12, 0.78, 0.1);
  leek.rotation.z = -0.3;
  const leekTop = cylinder(0.05, 0.03, 0.16, toon(0x3f8a3a));
  leekTop.position.set(0.18, 1.0, 0.1);
  leekTop.rotation.z = -0.3;
  rollator.add(basket, zopf, leek, leekTop);
  return rollator;
}

const headWorld = new Vector3();

/** Turns a head towards a world point, relative to its body's yaw — but no owl tricks beyond `maxYaw`. */
export function turnHeadTowards(head: Object3D, bodyYaw: number, target: Vector3, maxYaw: number): void {
  head.getWorldPosition(headWorld);
  const worldYaw = Math.atan2(target.x - headWorld.x, target.z - headWorld.z);
  const localYaw = MathUtils.euclideanModulo(worldYaw - bodyYaw + Math.PI, Math.PI * 2) - Math.PI;
  head.rotation.y = MathUtils.clamp(localYaw, -maxYaw, maxYaw);
}

export interface Passerby {
  root: Group;
  head: Group;
  legs: [Group, Group];
  arms: [Group, Group];
  mouth: Mesh;
  dizzyStars: Group;
}

/** `tufts`: a toddler's first few wisps on an otherwise bare head. */
export type HairStyle = 'short' | 'bun' | 'ponytail' | 'bald' | 'hat' | 'tufts' | 'long';

export interface PasserbyLook {
  shirt: number;
  trousers: number;
  hair: number;
  hairStyle: HairStyle;
  skin?: number;
  shoes?: number;
  glasses?: boolean;
  beard?: boolean;
  /** Three-day stubble: a thin dark shadow over the lower face. */
  stubble?: boolean;
  /** Hibiscus flowers printed all over the shirt. */
  hawaiiShirt?: boolean;
  /** A dress in this colour, flaring from the waist to the knees. */
  dress?: number;
  /** A pearl necklace in this colour. */
  necklace?: number;
  headband?: number;
  bag?: number;
  backpack?: number;
}

/** [x, y offset from the torso centre, colour] — alternating front and back. */
const HAWAII_FLOWERS: readonly [number, number, number][] = [
  [-0.13, 0.2, 0xff4f5a],
  [0.1, 0.18, 0xffe14a],
  [0.12, -0.02, 0xffffff],
  [-0.12, 0, 0xff4f5a],
  [-0.05, -0.2, 0xffe14a],
  [0.1, -0.22, 0xff4f5a],
  [0.02, 0.06, 0xff4f5a],
  [-0.02, -0.1, 0xffffff],
];

/** Five round petals around a yellow centre, flat against a surface facing ±z. */
function createFlower(color: number, x: number, y: number, z: number, facing: 1 | -1): Group {
  const flower = new Group();
  flower.position.set(x, y, z);
  const petalMaterial = toon(color);
  for (let petal = 0; petal < 5; petal++) {
    const angle = (petal * Math.PI * 2) / 5;
    const leaf = sphere(0.028, petalMaterial);
    leaf.scale.set(1, 1, 0.25);
    leaf.position.set(Math.cos(angle) * 0.03, Math.sin(angle) * 0.03, 0);
    flower.add(leaf);
  }
  const center = sphere(0.014, toon(0xffb020));
  center.position.z = facing * 0.006;
  flower.add(center);
  return flower;
}

const TODDLER_SCALE = 0.5;
const TODDLER_HEAD_SCALE = 1.5;

/** A two-year-old: knee-high to the grown-ups, big head, rosy cheeks, a big grin and a hair bow. */
export function createToddler(look: PasserbyLook, bowColor: number): Passerby {
  const toddler = createPasserby(look);
  toddler.root.scale.setScalar(TODDLER_SCALE);
  toddler.head.scale.setScalar(TODDLER_HEAD_SCALE);
  toddler.mouth.scale.set(1.7, 0.6, 0.5);
  const blushMaterial = toon(0xff9a9a);
  const bowMaterial = toon(bowColor);
  for (const side of [-1, 1]) {
    const blush = sphere(0.03, blushMaterial);
    blush.scale.set(1, 0.6, 0.4);
    blush.position.set(side * 0.1, 0.09, 0.14);
    const loop = sphere(0.04, bowMaterial);
    loop.scale.set(1.2, 0.8, 0.5);
    loop.position.set(0.06 + side * 0.045, 0.3, 0.02);
    toddler.head.add(blush, loop);
  }
  const knot = sphere(0.02, bowMaterial);
  knot.position.set(0.06, 0.3, 0.03);
  toddler.head.add(knot);
  return toddler;
}

export function createPasserby(look: PasserbyLook): Passerby {
  const root = new Group();
  const skin = toon(look.skin ?? SKIN);
  const hairMaterial = toon(look.hair);

  const legs = [-1, 1].map((side) => {
    const hip = new Group();
    hip.position.set(side * 0.11, 0.9, 0);
    const leg = box(0.15, 0.9, 0.17, toon(look.trousers));
    leg.position.y = -0.45;
    const shoe = box(0.16, 0.09, 0.27, toon(look.shoes ?? INK));
    shoe.position.set(0, -0.87, 0.04);
    hip.add(leg, shoe);
    root.add(hip);
    return hip;
  }) as [Group, Group];

  const torso = box(0.46, 0.66, 0.26, toon(look.shirt));
  torso.position.y = 1.23;
  const belt = box(0.47, 0.06, 0.27, toon(0x3a2a1e));
  belt.position.y = 0.92;
  const collar = box(0.22, 0.05, 0.27, toon(0xffffff));
  collar.position.y = 1.55;
  const neck = cylinder(0.06, 0.06, 0.1, skin);
  neck.position.y = 1.6;
  root.add(torso, belt, collar, neck);
  if (look.hawaiiShirt) {
    // Hibiscus print, front and back.
    HAWAII_FLOWERS.forEach(([x, y, color], index) => {
      const side = index % 2 === 0 ? 1 : -1;
      root.add(createFlower(color, x, 1.23 + y, side * 0.131, side));
    });
  }
  if (look.dress !== undefined) {
    const skirt = cylinder(0.26, 0.4, 0.52, toon(look.dress));
    skirt.position.y = 0.68;
    root.add(skirt);
  }
  if (look.necklace !== undefined) {
    const necklace = new Mesh(new TorusGeometry(0.1, 0.014, 6, 18), toon(look.necklace));
    necklace.rotation.x = Math.PI / 2 - 0.35;
    necklace.position.set(0, 1.55, 0.04);
    root.add(necklace);
  }

  const arms = [-1, 1].map((side) => {
    const shoulder = new Group();
    shoulder.position.set(side * 0.3, 1.52, 0);
    const arm = box(0.12, 0.6, 0.13, toon(look.shirt));
    arm.position.y = -0.3;
    const hand = sphere(0.07, skin);
    hand.position.y = -0.63;
    shoulder.add(arm, hand);
    if (look.hawaiiShirt) {
      shoulder.add(createFlower(side === 1 ? 0xffe14a : 0xff4f5a, 0, -0.18, 0.066, 1));
    }
    root.add(shoulder);
    return shoulder;
  }) as [Group, Group];
  if (look.bag !== undefined) {
    const bag = box(0.08, 0.3, 0.32, toon(look.bag));
    bag.position.set(0.06, -0.7, 0);
    const strap = box(0.02, 0.2, 0.02, toon(look.bag));
    strap.position.set(0.04, -0.55, 0);
    arms[0].add(bag, strap);
  }
  if (look.backpack !== undefined) {
    const backpack = box(0.38, 0.44, 0.2, toon(look.backpack));
    backpack.position.set(0, 1.25, -0.23);
    const flap = box(0.3, 0.14, 0.04, toon(0xffffff));
    flap.position.set(0, 1.36, -0.34);
    root.add(backpack, flap);
  }

  const head = new Group();
  head.position.y = 1.66;
  root.add(head);
  const face = sphere(0.17, skin);
  face.position.y = 0.13;
  const nose = sphere(0.035, skin);
  nose.position.set(0, 0.11, 0.17);
  nose.scale.set(0.8, 1, 1);
  head.add(face, nose);
  addHair(head, look.hairStyle, hairMaterial);
  for (const side of [-1, 1]) {
    const eye = sphere(0.025, toon(INK));
    eye.position.set(side * 0.06, 0.16, 0.155);
    const brow = box(0.06, 0.012, 0.02, hairMaterial);
    brow.position.set(side * 0.06, 0.205, 0.155);
    brow.rotation.z = side * -0.15;
    const ear = sphere(0.035, skin);
    ear.position.set(side * 0.17, 0.12, 0);
    head.add(eye, brow, ear);
  }
  if (look.glasses) {
    for (const side of [-1, 1]) {
      const rim = new Mesh(new TorusGeometry(0.035, 0.007, 6, 16), toon(INK));
      rim.position.set(side * 0.06, 0.16, 0.168);
      head.add(rim);
    }
    const bridge = box(0.04, 0.008, 0.008, toon(INK));
    bridge.position.set(0, 0.165, 0.17);
    head.add(bridge);
  }
  if (look.beard) {
    const beard = sphere(0.13, hairMaterial);
    beard.scale.set(1.05, 0.7, 0.8);
    beard.position.set(0, 0.03, 0.06);
    head.add(beard);
  }
  if (look.stubble) {
    // Just a light shadow along the jaw and chin.
    const stubble = sphere(0.171, toon(0xb08e72));
    stubble.scale.set(0.95, 0.38, 0.96);
    stubble.position.set(0, 0.03, 0.005);
    head.add(stubble);
  }
  if (look.headband !== undefined) {
    const band = cylinder(0.175, 0.175, 0.04, toon(look.headband));
    band.position.y = 0.24;
    head.add(band);
  }
  const mouth = sphere(0.03, toon(0x7a2030));
  mouth.position.set(0, 0.06, 0.16);
  mouth.scale.set(1, 0.25, 0.5);
  head.add(mouth);

  const dizzyStars = new Group();
  dizzyStars.position.y = 0.42;
  dizzyStars.visible = false;
  for (let index = 0; index < 3; index++) {
    const star = sphere(0.04, toon(0xffe14a, 0x886600));
    const angle = (index * Math.PI * 2) / 3;
    star.position.set(Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22);
    dizzyStars.add(star);
  }
  head.add(dizzyStars);

  return { root, head, legs, arms, mouth, dizzyStars };
}

function addHair(head: Group, style: HairStyle, material: MeshToonMaterial): void {
  if (style === 'bald') {
    const fringe = sphere(0.172, material);
    fringe.scale.set(1.02, 0.35, 1.02);
    fringe.position.set(0, 0.1, -0.02);
    head.add(fringe);
    return;
  }
  if (style === 'tufts') {
    [-0.5, 0, 0.45].forEach((tilt, index) => {
      const wisp = cylinder(0.012, 0.004, 0.09, material);
      wisp.position.set(tilt * 0.06, 0.32 - index * 0.005, 0.02 - index * 0.02);
      wisp.rotation.z = -tilt;
      head.add(wisp);
    });
    return;
  }
  const cap = sphere(0.18, material);
  cap.position.set(0, 0.19, -0.03);
  cap.scale.set(1, 0.7, 1);
  head.add(cap);
  if (style === 'bun') {
    const bun = sphere(0.08, material);
    bun.position.set(0, 0.34, -0.08);
    head.add(bun);
  } else if (style === 'ponytail') {
    const tail = cylinder(0.04, 0.02, 0.28, material);
    tail.position.set(0, 0.12, -0.2);
    tail.rotation.x = 0.4;
    head.add(tail);
  } else if (style === 'long') {
    // Open hair falling over the back and both sides down to the shoulders, with a side parting.
    const back = box(0.34, 0.42, 0.1, material);
    back.position.set(0, -0.02, -0.14);
    head.add(back);
    for (const side of [-1, 1]) {
      const strand = box(0.07, 0.36, 0.2, material);
      strand.position.set(side * 0.16, 0.02, -0.03);
      strand.rotation.z = side * 0.06;
      head.add(strand);
    }
    const parting = sphere(0.1, material);
    parting.scale.set(1.2, 0.45, 0.9);
    parting.position.set(0.05, 0.27, 0.07);
    head.add(parting);
  } else if (style === 'hat') {
    const hatMaterial = toon(0x4a5a3a);
    const brim = cylinder(0.27, 0.27, 0.02, hatMaterial);
    brim.position.y = 0.27;
    const crown = cylinder(0.15, 0.17, 0.14, hatMaterial);
    crown.position.y = 0.35;
    const feather = box(0.015, 0.14, 0.04, toon(0xe2453b));
    feather.position.set(0.15, 0.4, -0.02);
    feather.rotation.z = -0.3;
    head.add(brim, crown, feather);
  }
}

export interface Cyclist {
  /** Bike and rider; rides towards -x. */
  root: Group;
  rider: Passerby;
}

export function createCyclist(frameColor: number, look: PasserbyLook): Cyclist {
  const root = new Group();
  const rider = createPasserby(look);
  // Characters face +z; turn the rider towards the handlebar and sit them on the saddle.
  rider.root.rotation.set(0.25, -Math.PI / 2, 0, 'YXZ');
  rider.root.position.set(0.2, -0.05, 0);
  rider.arms.forEach((arm) => {
    arm.rotation.x = -1.2;
  });
  root.add(createBike(frameColor), rider.root);
  return { root, rider };
}

/** Pedalling: legs go round, arms stay on the handlebar. */
export function pedal(cyclist: Cyclist, phase: number): void {
  cyclist.rider.legs[0].rotation.x = -0.9 + Math.sin(phase) * 0.45;
  cyclist.rider.legs[1].rotation.x = -0.9 - Math.sin(phase) * 0.45;
}

/** Swings legs and arms;`phase` is any monotonically increasing value (e.g. distance walked). */
export function walkCycle(person: Passerby, phase: number, amplitude = 0.5): void {
  const swing = Math.sin(phase) * amplitude;
  person.legs[0].rotation.x = swing;
  person.legs[1].rotation.x = -swing;
  person.arms[0].rotation.x = -swing * 0.8;
  person.arms[1].rotation.x = swing * 0.8;
}

export interface Dog {
  root: Group;
  tail: Group;
  body: Group;
}

export function createDog(): Dog {
  const root = new Group();
  const fur = toon(0xd99a4e);
  const body = new Group();
  root.add(body);
  const torso = box(0.28, 0.26, 0.6, fur);
  torso.position.y = 0.38;
  const head = box(0.24, 0.22, 0.24, fur);
  head.position.set(0, 0.6, 0.34);
  const snout = box(0.12, 0.1, 0.12, toon(0xf1d2a8));
  snout.position.set(0, 0.56, 0.5);
  const nose = sphere(0.03, toon(INK));
  nose.position.set(0, 0.6, 0.56);
  body.add(torso, head, snout, nose);
  for (const side of [-1, 1]) {
    const ear = box(0.06, 0.14, 0.08, toon(0x8a5a2c));
    ear.position.set(side * 0.13, 0.66, 0.3);
    const leg = box(0.07, 0.26, 0.07, fur);
    leg.position.set(side * 0.09, 0.13, 0.2);
    const backLeg = box(0.07, 0.26, 0.07, fur);
    backLeg.position.set(side * 0.09, 0.13, -0.2);
    body.add(ear, leg, backLeg);
  }
  const tail = new Group();
  tail.position.set(0, 0.48, -0.3);
  const tailMesh = box(0.05, 0.05, 0.25, fur);
  tailMesh.position.z = -0.12;
  tailMesh.rotation.x = 0.6;
  tail.add(tailMesh);
  body.add(tail);
  return { root, tail, body };
}

export interface PovHands {
  root: Group;
  keyHand: Group;
  fobLed: MeshToonMaterial;
}

/** Alain's right hand with car key, parented to the camera (camera looks down -z). */
export function createPovHands(): PovHands {
  const root = new Group();
  const keyHand = new Group();
  keyHand.position.set(0.3, -0.34, -0.62);
  keyHand.rotation.set(0.3, -0.25, 0.1);
  const skin = toon(SKIN);
  const sleeve = cylinder(0.055, 0.06, 0.3, toon(0x2f4f7f));
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.2;
  const cuff = cylinder(0.058, 0.058, 0.03, toon(0x24406a));
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 0.06;
  const wrist = cylinder(0.035, 0.04, 0.06, skin);
  wrist.rotation.x = Math.PI / 2;
  wrist.position.z = 0.04;
  const watchStrap = cylinder(0.042, 0.042, 0.018, toon(0x5a3a22));
  watchStrap.rotation.x = Math.PI / 2;
  watchStrap.position.z = 0.03;
  const watchFace = cylinder(0.02, 0.02, 0.01, toon(0xf4f4f4));
  watchFace.position.set(0, 0.04, 0.03);
  const palm = box(0.09, 0.05, 0.1, skin);
  palm.position.z = -0.02;
  keyHand.add(sleeve, cuff, wrist, watchStrap, watchFace, palm);
  // Four fingers curled around the fob.
  for (let finger = 0; finger < 4; finger++) {
    const knuckle = box(0.02, 0.035, 0.045, skin);
    knuckle.position.set(0.035 - finger * 0.022, -0.005, -0.085);
    knuckle.rotation.x = 0.5;
    keyHand.add(knuckle);
  }
  const fob = box(0.045, 0.022, 0.08, toon(INK));
  fob.position.set(-0.01, 0.035, -0.04);
  const fobLed = toon(0x3a0d0d);
  fobLed.emissiveIntensity = GLOW_INTENSITY;
  const led = sphere(0.007, fobLed);
  led.position.set(-0.01, 0.048, -0.065);
  const keyRing = new Mesh(new TorusGeometry(0.015, 0.003, 6, 12), toon(0xcfcfcf));
  keyRing.position.set(-0.01, 0.03, 0.005);
  const thumb = box(0.025, 0.025, 0.055, skin);
  thumb.position.set(-0.05, 0.03, -0.05);
  thumb.rotation.y = 0.3;
  keyHand.add(fob, led, keyRing, thumb);
  root.add(keyHand);
  return { root, keyHand, fobLed };
}
