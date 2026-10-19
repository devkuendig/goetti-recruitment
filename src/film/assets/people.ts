import { Group, MathUtils, Mesh, TorusGeometry, Vector3, type MeshToonMaterial, type Object3D } from 'three';
import { box, cylinder, GLOW_INTENSITY, sphere, toon } from '../engine/build';
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
  sunglasses: Group;
  /** Big eyes behind the sunglasses, hidden until the glasses are pushed up. */
  eyes: [Group, Group];
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

  const torso = box(0.26, 0.3, 0.18, toon(0xffffff));
  torso.position.set(0, 0.36, 0.22);
  torso.rotation.x = 0.55;
  const goldChain = new Mesh(new TorusGeometry(0.1, 0.012, 6, 20), toon(0xf2c230));
  goldChain.rotation.x = Math.PI / 2 - 0.5;
  goldChain.position.set(0, 0.46, 0.32);
  root.add(torso, goldChain);

  // Oversized toddler head, leaning far out of the window so it reads from across the street.
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
  const capMaterial = toon(0xe23b3b);
  const cap = sphere(KID_HEAD_RADIUS + 0.01, capMaterial);
  cap.scale.set(1, 0.55, 1);
  cap.position.y = 0.08;
  const brim = box(0.2, 0.025, 0.16, capMaterial);
  brim.position.set(0, 0.1, -0.24);
  head.add(cap, brim);

  const sunglasses = new Group();
  sunglasses.position.set(0, 0.04, 0.19);
  for (const side of [-1, 1]) {
    const lens = box(0.13, 0.075, 0.03, toon(INK));
    lens.position.x = side * 0.075;
    sunglasses.add(lens);
  }
  const bridge = box(0.03, 0.015, 0.02, toon(INK));
  sunglasses.add(bridge);
  head.add(sunglasses);
  const eyes = [-1, 1].map((side) => {
    const eye = new Group();
    eye.position.set(side * 0.075, 0.04, 0.165);
    eye.visible = false;
    const white = sphere(0.04, toon(0xffffff));
    white.scale.set(1, 1.15, 0.8);
    const pupil = sphere(0.022, toon(INK));
    pupil.position.set(0, -0.005, 0.03);
    const highlight = sphere(0.007, toon(0xffffff));
    highlight.position.set(0.008, 0.008, 0.05);
    eye.add(white, pupil, highlight);
    head.add(eye);
    return eye;
  }) as [Group, Group];
  const glintAnchor = new Group();
  glintAnchor.position.set(0.1, 0.06, 0.22);
  head.add(glintAnchor);

  const tattoo = createPacifier(0x2a3f8f, 0.25);
  tattoo.position.set(-0.14, -0.04, 0.15);
  tattoo.rotation.set(0, -0.7, 0.4);
  head.add(tattoo);

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

  return { root, head, wavingArm, whistleMouth, glintAnchor, pacifier, sunglasses, eyes };
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

export type HairStyle = 'short' | 'bun' | 'ponytail' | 'bald' | 'hat';

export interface PasserbyLook {
  shirt: number;
  trousers: number;
  hair: number;
  hairStyle: HairStyle;
  skin?: number;
  shoes?: number;
  glasses?: boolean;
  beard?: boolean;
  headband?: number;
  bag?: number;
  backpack?: number;
}

const SCHOOLKID_SCALE = 0.75;

/** A pupil: a scaled-down passer-by. */
export function createSchoolkid(look: PasserbyLook): Passerby {
  const pupil = createPasserby(look);
  pupil.root.scale.setScalar(SCHOOLKID_SCALE);
  return pupil;
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

  const arms = [-1, 1].map((side) => {
    const shoulder = new Group();
    shoulder.position.set(side * 0.3, 1.52, 0);
    const arm = box(0.12, 0.6, 0.13, toon(look.shirt));
    arm.position.y = -0.3;
    const hand = sphere(0.07, skin);
    hand.position.y = -0.63;
    shoulder.add(arm, hand);
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

/** Swings legs and arms; `phase` is any monotonically increasing value (e.g. distance walked). */
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
