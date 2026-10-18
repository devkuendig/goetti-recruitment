import { Group, Mesh, TorusGeometry, type MeshToonMaterial } from 'three';
import { box, cylinder, sphere, toon } from '../engine/build';
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
}

export function createKid(): Kid {
  const root = new Group();
  const skin = toon(SKIN);

  ['#ff8fb1', '#8fd3ff', '#ffe08f'].forEach((color, index) => {
    const pillow = box(0.42, 0.07, 0.38, toon(color));
    pillow.position.y = 0.035 + index * 0.07;
    root.add(pillow);
  });

  const torso = box(0.26, 0.3, 0.18, toon(0xffffff));
  torso.position.set(0, 0.36, 0.12);
  torso.rotation.x = 0.35;
  const goldChain = new Mesh(new TorusGeometry(0.1, 0.012, 6, 20), toon(0xf2c230));
  goldChain.rotation.x = Math.PI / 2 - 0.5;
  goldChain.position.set(0, 0.47, 0.2);
  root.add(torso, goldChain);

  const head = new Group();
  head.position.set(0, 0.62, 0.33);
  root.add(head);
  head.add(sphere(0.17, skin));
  const curl = new Mesh(new TorusGeometry(0.04, 0.015, 6, 12), toon(0x6b4423));
  curl.position.set(0, 0.17, 0);
  head.add(curl);
  for (const side of [-1, 1]) {
    const ear = sphere(0.04, skin);
    ear.position.set(side * 0.17, 0, 0);
    head.add(ear);
  }

  const sunglasses = new Group();
  sunglasses.position.set(0, 0.03, 0.15);
  for (const side of [-1, 1]) {
    const lens = box(0.11, 0.065, 0.03, toon(INK));
    lens.position.x = side * 0.065;
    sunglasses.add(lens);
  }
  const bridge = box(0.03, 0.015, 0.02, toon(INK));
  sunglasses.add(bridge);
  head.add(sunglasses);
  const glintAnchor = new Group();
  glintAnchor.position.set(0.09, 0.05, 0.18);
  head.add(glintAnchor);

  const tattoo = createPacifier(0x2a3f8f, 0.22);
  tattoo.position.set(-0.11, -0.06, 0.125);
  tattoo.rotation.set(0, -0.6, 0.4);
  head.add(tattoo);

  const whistleMouth = sphere(0.022, toon(0x9b2d3a));
  whistleMouth.position.set(0, -0.08, 0.16);
  whistleMouth.scale.set(1.4, 0.4, 0.6);
  head.add(whistleMouth);

  const wavingArm = new Group();
  wavingArm.position.set(0.14, 0.45, 0.24);
  wavingArm.rotation.x = 0.9;
  const forearm = cylinder(0.035, 0.035, 0.3, skin);
  forearm.position.y = 0.15;
  const hand = sphere(0.05, skin);
  hand.position.y = 0.32;
  wavingArm.add(forearm, hand);
  root.add(wavingArm);

  return { root, head, wavingArm, whistleMouth, glintAnchor };
}

export interface Passerby {
  root: Group;
  head: Group;
  legs: [Group, Group];
  arms: [Group, Group];
  mouth: Mesh;
  dizzyStars: Group;
}

export function createPasserby(shirt: number, hair: number, trousers: number): Passerby {
  const root = new Group();
  const skin = toon(SKIN);

  const legs = [-1, 1].map((side) => {
    const hip = new Group();
    hip.position.set(side * 0.11, 0.9, 0);
    const leg = box(0.15, 0.9, 0.17, toon(trousers));
    leg.position.y = -0.45;
    const shoe = box(0.16, 0.08, 0.26, toon(INK));
    shoe.position.set(0, -0.88, 0.04);
    hip.add(leg, shoe);
    root.add(hip);
    return hip;
  }) as [Group, Group];

  const torso = box(0.46, 0.66, 0.26, toon(shirt));
  torso.position.y = 1.23;
  root.add(torso);

  const arms = [-1, 1].map((side) => {
    const shoulder = new Group();
    shoulder.position.set(side * 0.3, 1.52, 0);
    const arm = box(0.12, 0.6, 0.13, toon(shirt));
    arm.position.y = -0.3;
    const hand = sphere(0.07, skin);
    hand.position.y = -0.63;
    shoulder.add(arm, hand);
    root.add(shoulder);
    return shoulder;
  }) as [Group, Group];

  const head = new Group();
  head.position.y = 1.66;
  root.add(head);
  const face = sphere(0.17, skin);
  face.position.y = 0.13;
  const hairCap = sphere(0.18, toon(hair));
  hairCap.position.set(0, 0.19, -0.03);
  hairCap.scale.set(1, 0.7, 1);
  head.add(face, hairCap);
  for (const side of [-1, 1]) {
    const eye = sphere(0.025, toon(INK));
    eye.position.set(side * 0.06, 0.16, 0.155);
    head.add(eye);
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
  const sleeve = cylinder(0.055, 0.06, 0.3, toon(0x2f4f7f));
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.2;
  const hand = box(0.09, 0.05, 0.11, toon(SKIN));
  const fob = box(0.045, 0.02, 0.08, toon(INK));
  fob.position.set(-0.01, 0.035, -0.02);
  const fobLed = toon(0x3a0d0d);
  const led = sphere(0.007, fobLed);
  led.position.set(-0.01, 0.047, -0.045);
  const thumb = box(0.025, 0.025, 0.05, toon(SKIN));
  thumb.position.set(-0.05, 0.02, -0.03);
  keyHand.add(sleeve, hand, fob, led, thumb);
  root.add(keyHand);
  return { root, keyHand, fobLed };
}
