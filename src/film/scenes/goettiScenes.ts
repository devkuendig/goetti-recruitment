import { ConeGeometry, Group, MathUtils, Mesh, Vector3, type Sprite } from 'three';
import { createSparkle } from '../assets/b05';
import { createBanana } from '../assets/bananas';
import { SIDE_STREET, sideStreetToWorld } from '../assets/city';
import {
  createKid,
  createPasserby,
  createPram,
  createToddler,
  KID_MOUTH_OPEN,
  turnHeadTowards,
  walkCycle,
  type Kid,
  type Passerby,
  type Pram,
} from '../assets/people';
import { createBench, createFlowerBox } from '../assets/streetFurniture';
import { box, cylinder, setOutlineThickness, sphere, toon } from '../engine/build';
import { cruiseProgress } from '../engine/route';
import type { ChoiceOption } from '../engine/story';
import { ease, lerp, Timeline } from '../engine/timeline';
import { aim, direct, driverCamera, EYE_HEIGHT, LANE_Z, OUTLINE, placeCar, POV_FOV, STOPS, type World } from './world';

// Everything in this file lives in the side street's street frame (see `SIDE_STREET`): positions
// are local to `world.city.sideStreet`, camera points go through `sideStreetToWorld`.

const IDLE_SECONDS = 3600;
/** Everyone in the family walks towards -x, towards Alain. */
const FAMILY_YAW = -Math.PI / 2;
/** The same heading in world space, for head turns towards world points. */
const FAMILY_WORLD_YAW = FAMILY_YAW + SIDE_STREET.yaw;
const PRAM_Z = 8.6;
const PRAM_START_X = 80;
const PRAM_STOP_X = 65.8;
const FAMILY_WALK_START = 2;
const FAMILY_WALK_SECONDS = 13.5;
/** Alain greets the family and they wave back (seconds into `parkAndMeetFamily`). */
const GREETING_START = 14.5;
const GREETING_SECONDS = 2.4;
const PRAM_WHEEL_RADIUS = 0.15;
const ALAIN_SPOT = new Vector3(63.4, EYE_HEIGHT, 7.4);
const ALAIN_SPOT_WORLD = sideStreetToWorld(ALAIN_SPOT);
/** Storm drain in the gutter, right in front of Alain. */
const DRAIN = new Vector3(64.3, 0.012, 6.15);
/** Where Alain's hand closes round the rolling pacifier — a hand's breadth before the drain. */
const CATCH_SPOT = new Vector3(64.75, 0.06, 6.3);
const SIDEWALK_TOP = 0.1;
const SWARM_SIZE = 40;
const COCKPIT_FLY_COUNT = 24;

export interface FamilyCast {
  papa: Passerby;
  mama: Passerby;
  moana: Passerby;
  moanaBanana: Group;
  pram: Pram;
  kid: Kid;
  eyeSparkles: Sprite[];
  tears: Mesh[];
  confetti: Mesh[];
  /** Fruit flies around the car (side street frame). */
  swarm: Mesh[];
  /** Fruit flies right in front of Alain's eyes (camera children). */
  cockpitFlies: Mesh[];
  balloon: HeartBalloon;
}

/** Offsets from the pram, in street-frame x/z (the family walks towards -x). */
const PAPA_OFFSET = { x: 1.15, z: PRAM_Z };
const MAMA_OFFSET = { x: 0.55, z: 9.6 };
const MOANA_OFFSET = { x: -0.5, z: 9.75 };
const MOANA_BITE_ARM = -2.4;
const MOANA_HOLD_ARM = -1.5;
const CONFETTI_COLORS = [0xff6fa5, 0xffd84a, 0x39c0e0, 0x6cc070, 0xff8a3a, 0xc98aff];

export function createFamilyCast(world: World): FamilyCast {
  const scene = world.city.sideStreet;
  // Papa: bald, a hint of stubble, Hawaii shirt, khaki shorts and flip-flop brown.
  const papa = createPasserby({
    shirt: 0x1fa7a0,
    trousers: 0xd8c49a,
    shoes: 0x8a5a2c,
    hair: 0x4a3a2e,
    hairStyle: 'bald',
    stubble: true,
    hawaiiShirt: true,
  });
  // Mama: open brown hair, bordeaux dress, pearls, heels and a golden clutch.
  const mama = createPasserby({
    shirt: 0x7a1f3d,
    dress: 0x7a1f3d,
    trousers: 0xf5c9a0,
    shoes: 0x1a1a22,
    hair: 0x6b4226,
    hairStyle: 'long',
    necklace: 0xf4f0e8,
    bag: 0xd4af37,
  });
  const moana = createToddler({ shirt: 0xff7fa8, trousers: 0xffd84a, hair: 0xf2d27a, hairStyle: 'tufts', shoes: 0xffffff }, 0xff4f8a);
  const moanaBanana = createBanana();
  moanaBanana.position.set(0, -0.68, 0.08);
  moanaBanana.rotation.set(0, Math.PI / 2, Math.PI / 2);
  moana.arms[1].add(moanaBanana);
  moana.arms[1].rotation.x = MOANA_HOLD_ARM;

  const pram = createPram();
  const kid = createKid();
  pram.seat.add(kid.root);
  const balloon = createHeartBalloon();
  pram.root.add(balloon.root);
  pram.root.add(createTeddy());
  papa.arms.forEach((arm) => {
    arm.rotation.x = -1.2;
  });

  const eyeSparkles = kid.eyes.map((eye) => {
    const sparkle = createSparkle();
    sparkle.position.set(0.01, 0.02, 0.06);
    eye.add(sparkle);
    return sparkle;
  });
  const tearMaterial = toon(0x8fd3ff);
  const tears = kid.eyes.map((eye) => {
    const tear = sphere(0.025, tearMaterial);
    tear.visible = false;
    tear.position.copy(eye.position);
    kid.head.add(tear);
    return tear;
  });

  const confetti = Array.from({ length: 70 }, (_unused, index) => {
    const piece = box(0.07, 0.01, 0.045, toon(CONFETTI_COLORS[index % CONFETTI_COLORS.length]));
    piece.visible = false;
    piece.castShadow = false;
    scene.add(piece);
    return piece;
  });

  const flyMaterial = toon(0x2a2018);
  const swarm = Array.from({ length: SWARM_SIZE }, () => {
    const fly = sphere(0.03, flyMaterial);
    fly.visible = false;
    fly.castShadow = false;
    scene.add(fly);
    return fly;
  });
  const cockpitFlies = Array.from({ length: COCKPIT_FLY_COUNT }, () => {
    const fly = sphere(0.006, flyMaterial);
    fly.visible = false;
    world.stage.camera.add(fly);
    return fly;
  });

  [papa.root, mama.root, moana.root, pram.root].forEach((root) => {
    setOutlineThickness(root, OUTLINE.character);
    scene.add(root);
  });
  scene.add(createDrain());
  furnishMeetingSpot(scene);
  const cast = { papa, mama, moana, moanaBanana, pram, kid, eyeSparkles, tears, confetti, swarm, cockpitFlies, balloon };
  placeFamily(cast, PRAM_START_X, 0);
  return cast;
}

interface HeartBalloon {
  root: Group;
  /** Sways on its string; rotate around z/x. */
  sway: Group;
}

/** Red heart balloon tied to the pram handle. Pram frame: front +z, handle at the back. */
function createHeartBalloon(): HeartBalloon {
  const root = new Group();
  root.position.set(0.15, 1.2, -0.75);
  const sway = new Group();
  root.add(sway);
  const string = cylinder(0.003, 0.003, 0.9, toon(0xffffff));
  string.position.y = 0.45;
  const balloonMaterial = toon(0xff3b5c);
  const heart = new Group();
  heart.position.y = 1.0;
  for (const side of [-1, 1]) {
    const lobe = sphere(0.1, balloonMaterial);
    lobe.position.set(side * 0.07, 0.04, 0);
    lobe.scale.set(1, 1, 0.7);
    heart.add(lobe);
  }
  const tip = new Mesh(new ConeGeometry(0.15, 0.2, 12), balloonMaterial);
  tip.rotation.z = Math.PI;
  tip.scale.set(1, 1, 0.5);
  tip.position.y = -0.08;
  heart.add(tip);
  sway.add(string, heart);
  return { root, sway };
}

/** Little brown teddy sitting at the foot of the pram, waving at nobody. */
function createTeddy(): Group {
  const teddy = new Group();
  teddy.position.set(0.12, 0.8, 0.25);
  const fur = toon(0xa8743a);
  const body = sphere(0.07, fur);
  body.scale.set(1, 1.1, 0.9);
  const head = sphere(0.055, fur);
  head.position.y = 0.1;
  const snout = sphere(0.022, toon(0xf1d2a8));
  snout.position.set(0, 0.09, 0.05);
  teddy.add(body, head, snout);
  for (const side of [-1, 1]) {
    const ear = sphere(0.02, fur);
    ear.position.set(side * 0.045, 0.15, 0);
    const eye = sphere(0.008, toon(0x1a1a22));
    eye.position.set(side * 0.02, 0.11, 0.05);
    teddy.add(ear, eye);
  }
  return teddy;
}

/** Bench and flower boxes on the sidewalk behind the meeting spot (street frame). */
function furnishMeetingSpot(scene: Group): void {
  const bench = createBench();
  bench.position.set(68.5, 0.1, 10.0);
  bench.rotation.y = Math.PI;
  scene.add(bench);
  for (const x of [61.2, 71.5]) {
    const flowers = createFlowerBox();
    flowers.position.set(x, 0.1, 10.2);
    scene.add(flowers);
  }
}

/** Runs for the whole film once the family exists: the balloon bobs on its string. */
export function familyLife(cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => {
    cast.balloon.sway.rotation.set(Math.sin(elapsed * 1.1) * 0.08, 0, Math.sin(elapsed * 1.6) * 0.12);
  }, ease.linear);
  return timeline;
}

/** Dolendeckel: a slotted cast-iron grate in the gutter. */
function createDrain(): Group {
  const drain = new Group();
  drain.position.copy(DRAIN);
  drain.add(box(0.5, 0.02, 0.35, toon(0x3a3a40)));
  for (let slot = 0; slot < 5; slot++) {
    const gap = box(0.06, 0.022, 0.25, toon(0x111114));
    gap.position.x = -0.18 + slot * 0.09;
    drain.add(gap);
  }
  return drain;
}

function placeFamily(cast: FamilyCast, pramX: number, walked: number): void {
  const { papa, mama, moana, pram } = cast;
  pram.root.position.set(pramX, 0.1, PRAM_Z);
  pram.root.rotation.y = FAMILY_YAW;
  pram.wheels.forEach((wheel) => {
    wheel.rotation.x = walked / PRAM_WHEEL_RADIUS;
  });
  papa.root.position.set(pramX + PAPA_OFFSET.x, 0.1, PAPA_OFFSET.z);
  mama.root.position.set(pramX + MAMA_OFFSET.x, 0.1, MAMA_OFFSET.z);
  moana.root.position.set(pramX + MOANA_OFFSET.x, 0.1, MOANA_OFFSET.z);
  [papa, mama, moana].forEach((person) => {
    person.root.rotation.y = FAMILY_YAW;
  });
}

function twinkleEyes(cast: FamilyCast, scales: readonly [number, number]): void {
  cast.eyeSparkles.forEach((sparkle, index) => sparkle.scale.setScalar(scales[index]));
}

function everyoneLooksAt(cast: FamilyCast, worldTarget: Vector3): void {
  [cast.papa, cast.mama, cast.moana].forEach((person) => turnHeadTowards(person.head, FAMILY_WORLD_YAW, worldTarget, 1.2));
}

/** Moana bounces along happily, the free arm cheering; call after `placeFamily`. */
function hopForJoy(moana: Passerby, elapsed: number): void {
  const bounce = Math.abs(Math.sin(elapsed * 6));
  moana.root.position.y = 0.1 + bounce * 0.14;
  moana.legs[0].rotation.x = -bounce * 0.5;
  moana.legs[1].rotation.x = -bounce * 0.5;
  moana.arms[0].rotation.set(-2.5 + Math.sin(elapsed * 6) * 0.3, 0, -0.3);
}

function moanaBite(timeline: Timeline, world: World, cast: FamilyCast, time: number): void {
  timeline.tween(time, 0.7, (progress) => {
    cast.moana.arms[1].rotation.x = lerp(MOANA_HOLD_ARM, MOANA_BITE_ARM, Math.sin(progress * Math.PI));
  }, ease.linear);
  timeline.at(time + 0.35, () => {
    world.sounds.munch();
    world.callouts.show('MAMPF!', cast.moana.head, 0.8, 0.35);
  });
}

const PARK_CAMERA = sideStreetToWorld(new Vector3(67.5, 1.0, 9.0));
/** Driver's door → round the bonnet → onto the sidewalk (street frame). */
const WALK_PATH = [
  new Vector3(60.15, 1.25, 3.35),
  new Vector3(60.4, EYE_HEIGHT, 3.1),
  new Vector3(63.1, EYE_HEIGHT, 3.3),
  ALAIN_SPOT,
];
const WALK_TIMES = [9.5, 10.1, 11.3, 12.6];

function walkPosition(elapsed: number, out: Vector3): Vector3 {
  const nextIndex = WALK_TIMES.findIndex((time) => time > elapsed);
  if (nextIndex === -1) {
    return out.copy(WALK_PATH[WALK_PATH.length - 1]);
  }
  if (nextIndex === 0) {
    return out.copy(WALK_PATH[0]);
  }
  const progress = (elapsed - WALK_TIMES[nextIndex - 1]) / (WALK_TIMES[nextIndex] - WALK_TIMES[nextIndex - 1]);
  return out.lerpVectors(WALK_PATH[nextIndex - 1], WALK_PATH[nextIndex], ease.inOut(progress));
}

/** Fruit flies zig-zag around `center` (any frame); `spread` in metres, `count` flies visible. */
function buzzAround(flies: readonly Mesh[], center: Vector3, spread: number, count: number, elapsed: number): void {
  flies.forEach((fly, index) => {
    fly.visible = index < count;
    const speed = 2.3 + (index % 7) * 0.4;
    const phase = index * 2.17;
    fly.position.set(
      center.x + Math.sin(elapsed * speed + phase) * spread * (0.4 + (index % 3) * 0.3),
      center.y + Math.sin(elapsed * speed * 1.7 + phase * 1.3) * spread * 0.5,
      center.z + Math.cos(elapsed * speed * 1.2 + phase) * spread * (0.4 + (index % 4) * 0.2),
    );
  });
}

const COCKPIT_SWARM_CENTER = new Vector3(0, -0.05, -0.7);
const POV_PACIFIER_HOLD = new Vector3(0.12, -0.24, -0.55);
const POV_DIVE_EYE = new Vector3(64.25, 0.45, 6.95);
/** After the belly landing he has skidded right up to the drain. */
const SKID_EYE = new Vector3(64.45, 0.32, 6.75);
/** Where the rolling pacifier is when Alain takes off — the slow motion covers the rest. */
const PRE_CATCH_SPOT = new Vector3(64.95, 0.06, 6.42);
// Beat times of the rescue (seconds into `parkAndMeetFamily`).
const DIVE_START = 23.4;
const CATCH_TIME = 26.3;
const SLOW_MOTION_END = CATCH_TIME;
const GET_UP_START = 26.9;
const GET_UP_END = 28;
// The toddler's dialogue: eyes sparkle and the mouth laughs the moment Alain picks up the pacifier,
// "Reflexe wie ein Götti!" right after "GERETTET!", then "Den will ich als Götti haben!".
const REFLEX_AT = CATCH_TIME + 0.5;
const REFLEX_SECONDS = 2.2;
const WISH_AT = REFLEX_AT + REFLEX_SECONDS + 0.2;
const DIALOGUE_END = WISH_AT + 2;
const KID_LAUGH = new Vector3(1.9, 1.5, 0.7);
// "Ja" ending: three fist pumps together after the family photo.
const FIST_PUMP_START = 8;
const FIST_PUMPS = 3;
const FIST_PUMP_PERIOD = 0.55;

/**
 * Loaded with bananas, Alain parks in the side street — and a cloud of fruit flies hatches from
 * the cargo. He flees the car, flailing, just as a family comes along the sidewalk. The toddler
 * in the pram giggles, the pacifier drops and rolls towards the drain; Alain catches it
 * in a slow-motion dive. "Reflexe wie ein Götti!" — big eyes: "Den will ich als Götti haben!"
 */
export function parkAndMeetFamily(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds, stage, hands } = world;
  const { sideStreet } = world.city;
  const { kid } = cast;
  const startDistance = world.odometer;

  timeline.at(0.2, () => sounds.electricWhir(5));
  timeline.tween(0, 7, (_progress, elapsed) => {
    placeCar(world, lerp(startDistance, STOPS.parking, cruiseProgress(elapsed, 7, 2, 2.5)));
  }, ease.linear);
  timeline.at(1.2, () => callouts.say('Uff … so viele Bananen.', thoughts, 2, 0));

  // ── Fruit flies hatch in the cockpit … ──────────────────────────────────────
  timeline.at(3.6, () => sounds.buzz(9));
  timeline.at(3.8, () => callouts.say('Moment … was summt denn da?', thoughts, 2, 0));
  timeline.at(5.9, () => callouts.show('FRUCHTFLIEGEN!!! 😱', thoughts, 1.8, -0.1));
  timeline.tween(3.6, 9.4, (_progress, elapsed) => {
    // From a scout to a cloud, then they lose him once he's out on the sidewalk.
    const growing = MathUtils.clamp(Math.round(2 + (elapsed / 2.6) * COCKPIT_FLY_COUNT), 0, COCKPIT_FLY_COUNT);
    const leaving = MathUtils.clamp(Math.round((9.4 - elapsed) * 8), 0, COCKPIT_FLY_COUNT);
    // They sit on the camera, so the outside shot (beat 6–9.5) must not show them.
    const isOutsideShot = elapsed >= 2.4 && elapsed < 5.9;
    buzzAround(cast.cockpitFlies, COCKPIT_SWARM_CENTER, 0.35, isOutsideShot ? 0 : Math.min(growing, leaving), elapsed);
  }, ease.linear);
  timeline.at(13.1, () => cast.cockpitFlies.forEach((fly) => {
    fly.visible = false;
  }));

  // ── … and swarm the parked car ───────────────────────────────────────────────
  const swarmCenter = new Vector3(60, 1.4, LANE_Z);
  timeline.tween(6, 6.5, (_progress, elapsed) => {
    const count = elapsed < 5 ? SWARM_SIZE : Math.round(SWARM_SIZE * (6.5 - elapsed) / 1.5);
    swarmCenter.y = 1.4 + Math.max(0, elapsed - 5) * 1.5;
    buzzAround(cast.swarm, swarmCenter, 1.6, count, elapsed);
  }, ease.linear);
  timeline.at(7.6, () => callouts.show('BZZZZ!', world.b05.root, 1.4, 2.2));

  // ── He flees: door open, round the bonnet, flailing ─────────────────────────
  timeline.at(10, () => callouts.say('Raus hier! Weg, weg, weg!', thoughts, 2.2, 0));
  for (let stepTime = 9.6; stepTime < 12.6; stepTime += 0.3) {
    timeline.at(stepTime, () => sounds.footstep());
  }
  timeline.tween(9.5, 4, (_progress, elapsed) => {
    hands.keyHand.rotation.set(0.3 + Math.sin(elapsed * 16) * 0.5, -0.25 + Math.cos(elapsed * 13) * 0.6, 0.1);
  }, ease.linear);
  timeline.tween(13.5, 0.3, (progress) => {
    hands.keyHand.rotation.set(0.3, -0.25, 0.1 * progress);
  });
  timeline.at(13.2, () => callouts.say('Puh … entkommen.', thoughts, 1.2, 0));

  // ── The family strolls along the sidewalk; Moana munches ────────────────────
  timeline.tween(FAMILY_WALK_START, FAMILY_WALK_SECONDS, (_progress, elapsed) => {
    const walked = (PRAM_START_X - PRAM_STOP_X) * cruiseProgress(elapsed, FAMILY_WALK_SECONDS, 0.5, 1.5);
    placeFamily(cast, PRAM_START_X - walked, walked);
    const isWalking = elapsed < FAMILY_WALK_SECONDS;
    walkCycle(cast.mama, walked * 4, isWalking ? 0.4 : 0);
    hopForJoy(cast.moana, elapsed);
    walkCycle(cast.papa, walked * 4, isWalking ? 0.35 : 0);
    cast.papa.arms.forEach((arm) => {
      arm.rotation.x = -1.2;
    });
    cast.moana.arms[1].rotation.x = MOANA_HOLD_ARM;
  }, ease.linear);
  moanaBite(timeline, world, cast, 15);
  moanaBite(timeline, world, cast, 17.2);

  // ── Alain spots them: "Hallo Familie Kündig!" — and everyone waves ─────────
  // After the walk tween, so the waving arms win over the walk cycle.
  timeline.at(GREETING_START, () => callouts.say('Hallo Familie Kündig! 👋', thoughts, 2.4, 0));
  timeline.tween(GREETING_START, GREETING_SECONDS, (progress, elapsed) => {
    const raised = Math.sin(progress * Math.PI);
    hands.keyHand.position.y = lerp(-0.34, -0.1, raised);
    hands.keyHand.rotation.set(0.3, -0.25, 0.1 + Math.sin(elapsed * 12) * 0.5 * raised);
  }, ease.linear);
  timeline.at(GREETING_START + 0.8, () => callouts.say('Hoi Alain!', cast.mama.head, 1.8, 0.45));
  timeline.tween(GREETING_START + 0.5, GREETING_SECONDS, (progress, elapsed) => {
    const raised = Math.sin(progress * Math.PI);
    const wiggle = Math.sin(elapsed * 10) * 0.35 * raised;
    cast.papa.arms[1].rotation.set(lerp(-1.2, -2.7, raised), 0, wiggle);
    cast.mama.arms[1].rotation.set(lerp(0, -2.7, raised), 0, wiggle);
    cast.moana.arms[0].rotation.z = -0.3 + wiggle * 1.5;
    everyoneLooksAt(cast, ALAIN_SPOT_WORLD);
    [cast.papa, cast.mama, cast.moana].forEach((person) => {
      person.head.rotation.y *= raised;
    });
  }, ease.linear);

  // ── The toddler giggles at the flailing stranger — and the pacifier drops ───
  timeline.tween(19.3, 0.6, (progress) => {
    turnHeadTowards(kid.head, FAMILY_WORLD_YAW, ALAIN_SPOT_WORLD, 1.0);
    kid.head.rotation.y *= progress;
  });
  timeline.at(19.8, () => callouts.show('HIHI!', kid.head, 1.4, 0.45));
  timeline.tween(19.8, 1.4, (_progress, elapsed) => {
    kid.head.rotation.z = Math.sin(elapsed * 18) * 0.12;
  }, ease.linear);
  const pacifierFall = new Vector3();
  const pacifierLanding = new Vector3();
  timeline.at(21.2, () => {
    kid.head.rotation.z = 0;
    sideStreet.attach(kid.pacifier);
    pacifierFall.copy(kid.pacifier.position);
    pacifierLanding.set(pacifierFall.x - 0.3, SIDEWALK_TOP + 0.03, pacifierFall.z - 0.4);
  });
  timeline.tween(21.25, 0.45, (progress) => {
    kid.pacifier.position.lerpVectors(pacifierFall, pacifierLanding, progress);
    kid.pacifier.rotation.x = progress * 2;
  }, ease.in);
  timeline.at(21.7, () => {
    sounds.plop();
    callouts.show('PLOPP!', kid.pacifier, 1.2, 0.2);
  });
  // It rolls off the curb, straight for the drain …
  timeline.tween(21.75, 1.65, (progress) => {
    kid.pacifier.position.lerpVectors(pacifierLanding, PRE_CATCH_SPOT, progress);
    const curbDrop = MathUtils.clamp((6.6 - kid.pacifier.position.z) / 0.15, 0, 1);
    kid.pacifier.position.y = lerp(SIDEWALK_TOP + 0.03, CATCH_SPOT.y, curbDrop);
    kid.pacifier.rotation.set(0, 0, progress * 14);
  }, ease.linear);
  timeline.at(22.1, () => callouts.say('Oh nein – der Nuggi!', cast.mama.head, 1.8, 0.45));
  // … and in slow motion teeters the last few centimetres towards the grate.
  timeline.tween(DIVE_START, CATCH_TIME - DIVE_START, (progress, elapsed) => {
    kid.pacifier.position.lerpVectors(PRE_CATCH_SPOT, CATCH_SPOT, progress);
    kid.pacifier.rotation.set(Math.sin(elapsed * 5) * 0.2, 0, 14 + progress * 2);
  }, ease.linear);

  // ── Dive! In slow motion. ─────────────────────────────────────────────────────
  timeline.at(DIVE_START, () => {
    sounds.whoosh();
    sounds.slowMotion(SLOW_MOTION_END - DIVE_START);
    callouts.show('HECHTSPRUNG!', thoughts, 1.4, -0.1);
  });
  timeline.at(DIVE_START + 0.7, () => callouts.show('N E E E I I I N !', thoughts, 2, 0.15));
  for (const beatTime of [DIVE_START + 0.9, DIVE_START + 1.9]) {
    timeline.at(beatTime, () => sounds.heartbeat());
  }
  // Mama's hands fly to her face; Moana freezes mid-hop.
  timeline.tween(DIVE_START + 0.3, 0.5, (progress) => {
    cast.mama.arms.forEach((arm, index) => {
      arm.rotation.set(lerp(0, -2.6, progress), 0, (index === 0 ? 1 : -1) * progress * 0.5);
    });
  });
  timeline.tween(CATCH_TIME + 0.4, 0.5, (progress) => {
    cast.mama.arms.forEach((arm, index) => {
      arm.rotation.set(lerp(-2.6, 0, progress), 0, (index === 0 ? 1 : -1) * (1 - progress) * 0.5);
    });
  });
  const caughtFrom = new Vector3();
  timeline.at(CATCH_TIME, () => {
    stage.camera.attach(kid.pacifier);
    caughtFrom.copy(kid.pacifier.position);
    sounds.ping(3000);
    sounds.whoosh();
    callouts.show('GERETTET!', thoughts, 1.6, -0.3);
  });
  timeline.at(CATCH_TIME + 0.25, () => callouts.show('RUTSCH!', thoughts, 0.9, -0.5));
  timeline.tween(CATCH_TIME + 0.05, 1.2, (progress) => {
    kid.pacifier.position.lerpVectors(caughtFrom, POV_PACIFIER_HOLD, progress);
    kid.pacifier.rotation.set(0.3, 0, 0);
  }, ease.out);

  // ── Pacifier saved: eyes go wide and sparkle, a big laugh — "Reflexe wie ein Götti!" ──
  timeline.tween(CATCH_TIME, 0.3, (progress) => {
    kid.eyes.forEach((eye) => eye.scale.setScalar(lerp(1, 1.45, progress)));
    kid.brows.forEach((brow) => {
      brow.position.y = lerp(0.115, 0.15, progress);
    });
    kid.whistleMouth.scale.lerpVectors(KID_MOUTH_OPEN, KID_LAUGH, progress);
  }, ease.out);
  for (const pingTime of [CATCH_TIME + 0.2, CATCH_TIME + 0.5]) {
    timeline.at(pingTime, () => sounds.ping(3400));
  }
  // They keep twinkling through the whole dialogue.
  timeline.tween(CATCH_TIME, DIALOGUE_END - CATCH_TIME, (_progress, elapsed) => {
    const sparkle = (index: number) => (0.5 + 0.5 * Math.max(0, Math.sin(elapsed * 4 + index * 1.4)) ** 4) * 0.3;
    twinkleEyes(cast, [sparkle(0), sparkle(1)]);
  }, ease.linear);
  timeline.at(REFLEX_AT, () => callouts.say('Reflexe wie ein Götti!', kid.head, REFLEX_SECONDS, 0.45));
  timeline.tween(WISH_AT - 0.4, 0.4, (progress) => {
    kid.wavingArm.rotation.set(lerp(0.9, 1.3, progress), 0, lerp(0, 0.8, progress));
  });
  timeline.at(WISH_AT, () => {
    sounds.squeal();
    callouts.say('Den will ich als Götti haben!', kid.head, 5, 0.45);
  });
  timeline.tween(WISH_AT, 1.6, (_progress, elapsed) => {
    kid.whistleMouth.scale.set(KID_LAUGH.x, KID_LAUGH.y + Math.sin(elapsed * 14) * 0.2, KID_LAUGH.z);
  }, ease.linear);

  // From the moment it drops, the toddler never takes its eyes off the pacifier.
  const pacifierSeen = new Vector3();
  const kidHeadSeen = new Vector3();
  timeline.tween(21.2, DIALOGUE_END + 2 - 21.2, () => {
    kid.pacifier.getWorldPosition(pacifierSeen);
    turnHeadTowards(kid.head, FAMILY_WORLD_YAW, pacifierSeen, 1.0);
    // Nod down to the gutter, up to Alain's hand (positive x tilts the face down).
    kid.head.getWorldPosition(kidHeadSeen);
    const distance = Math.hypot(pacifierSeen.x - kidHeadSeen.x, pacifierSeen.z - kidHeadSeen.z);
    kid.head.rotation.x = MathUtils.clamp(Math.atan2(kidHeadSeen.y - pacifierSeen.y, distance), -0.4, 0.6);
  }, ease.linear);
  timeline.tween(DIALOGUE_END + 0.1, 0.5, (progress) => {
    everyoneLooksAt(cast, ALAIN_SPOT_WORLD);
    [cast.papa, cast.mama, cast.moana].forEach((person) => {
      person.head.rotation.y *= progress;
    });
  });

  // ── Camera ──────────────────────────────────────────────────────────────────
  const eye = new Vector3();
  const target = new Vector3();
  const local = new Vector3();
  const kidHead = new Vector3();
  const pacifierWorld = new Vector3();
  const catchWorld = new Vector3();
  const pramTarget = () => sideStreetToWorld(local.copy(cast.pram.root.position).setY(1.1), target);
  direct(timeline, world, [
    {
      until: 6,
      view: 'driver',
      fov: POV_FOV,
      // Head darting after the flies.
      frame: (elapsed) => driverCamera(world, elapsed > 4 ? Math.sin(elapsed * 7) * 0.25 : 0, elapsed > 4 ? Math.sin(elapsed * 5) * 0.08 : 0),
    },
    {
      until: 9.5,
      view: 'free',
      fov: 45,
      frame: () => aim(world, PARK_CAMERA, target.copy(world.b05.root.position).setY(1.0)),
    },
    {
      until: 14,
      view: 'walker',
      fov: POV_FOV,
      frame: (elapsed) => {
        walkPosition(elapsed, local);
        // Running and ducking.
        local.y += Math.abs(Math.sin(elapsed * 11)) * 0.07;
        sideStreetToWorld(local, eye);
        const turnToFamily = MathUtils.clamp((elapsed - 11.3) / 1.6, 0, 1);
        local.set(local.x + 5, local.y - 0.3, local.z + 1.5).lerp(kidHead.set(72, 1.3, PRAM_Z), turnToFamily);
        aim(world, eye, sideStreetToWorld(local, target));
      },
    },
    {
      until: 19.2,
      view: 'walker',
      fov: POV_FOV,
      frame: (elapsed) => {
        // Still catching his breath.
        sideStreetToWorld(local.copy(ALAIN_SPOT).setY(EYE_HEIGHT - Math.abs(Math.sin(elapsed * 3)) * 0.04), eye);
        aim(world, eye, pramTarget());
      },
    },
    {
      until: 21.75,
      view: 'free',
      fov: 34,
      frame: () => {
        kid.head.getWorldPosition(kidHead);
        aim(world, sideStreetToWorld(local.set(ALAIN_SPOT.x + 0.9, 1.2, ALAIN_SPOT.z + 0.35), eye), kidHead);
      },
    },
    {
      until: 23.4,
      view: 'free',
      fov: 40,
      // Low in the gutter: the pacifier rolls towards the drain.
      frame: () => {
        kid.pacifier.getWorldPosition(pacifierWorld);
        aim(world, sideStreetToWorld(local.set(63.2, 0.35, 5.7), eye), pacifierWorld);
      },
    },
    {
      // Take-off: a crouch and a spring upwards, the view zooms onto the pacifier.
      until: DIVE_START + 0.5,
      view: 'walker',
      fov: (elapsed) => lerp(POV_FOV, 48, ease.out(MathUtils.clamp((elapsed - DIVE_START) / 0.5, 0, 1))),
      frame: (elapsed) => {
        const takeOff = MathUtils.clamp((elapsed - DIVE_START) / 0.5, 0, 1);
        sideStreetToWorld(local.copy(ALAIN_SPOT).setY(EYE_HEIGHT - 0.25 + Math.sin(takeOff * Math.PI * 0.5) * 0.55), eye);
        aim(world, eye, sideStreetToWorld(CATCH_SPOT, target));
      },
    },
    {
      // Slow-motion flight: a long arc down to the gutter, the world tilting and stretching.
      until: CATCH_TIME,
      view: 'walker',
      fov: (elapsed) => lerp(48, 88, ease.inOut(MathUtils.clamp((elapsed - DIVE_START - 0.5) / (CATCH_TIME - DIVE_START - 0.5), 0, 1))),
      frame: (elapsed) => {
        const flight = MathUtils.clamp((elapsed - DIVE_START - 0.5) / (CATCH_TIME - DIVE_START - 0.5), 0, 1);
        local.copy(ALAIN_SPOT).setY(EYE_HEIGHT + 0.3).lerp(POV_DIVE_EYE, ease.inOut(flight));
        local.y += Math.sin(flight * Math.PI) * 0.25;
        aim(world, sideStreetToWorld(local, eye), sideStreetToWorld(CATCH_SPOT, target));
        world.stage.camera.rotateZ(-0.5 * Math.sin(flight * Math.PI));
      },
    },
    {
      // Belly landing: skid forward along the gutter, the picture shaking.
      until: GET_UP_START,
      view: 'walker',
      fov: (elapsed) => lerp(88, POV_FOV, ease.out(MathUtils.clamp((elapsed - CATCH_TIME) / 0.6, 0, 1))),
      frame: (elapsed) => {
        const skid = ease.out(MathUtils.clamp((elapsed - CATCH_TIME) / 0.6, 0, 1));
        const shake = Math.sin(elapsed * 70) * 0.03 * (1 - skid);
        local.lerpVectors(POV_DIVE_EYE, SKID_EYE, skid);
        local.y += shake;
        sideStreetToWorld(local, eye);
        // Straight from the pacifier up to the pram: the toddler's reaction must be in shot.
        aim(world, eye, sideStreetToWorld(CATCH_SPOT, catchWorld).lerp(pramTarget(), skid));
        world.stage.camera.rotateZ(shake * 3);
      },
    },
    {
      until: GET_UP_END,
      view: 'walker',
      fov: POV_FOV,
      frame: (elapsed) => {
        const getUp = ease.inOut(MathUtils.clamp((elapsed - GET_UP_START) / (GET_UP_END - GET_UP_START), 0, 1));
        sideStreetToWorld(local.lerpVectors(SKID_EYE, ALAIN_SPOT, getUp), eye);
        aim(world, eye, pramTarget());
      },
    },
    {
      // Back on his feet, he watches the toddler from where he stands — no close-up.
      until: DIALOGUE_END + 2,
      view: 'walker',
      fov: (elapsed) => lerp(POV_FOV, 50, ease.inOut(MathUtils.clamp(elapsed - GET_UP_END, 0, 1))),
      frame: () => aim(world, ALAIN_SPOT_WORLD, pramTarget().setY(1.0)),
    },
  ]);
  return timeline;
}

export const GOETTI_QUESTION = 'Willst du Götti werden?';
export const GOETTI_OPTIONS: readonly ChoiceOption[] = [
  { icon: '💛', label: 'Ja' },
  { icon: '🙅', label: 'Nein' },
  { icon: '🤔', label: 'Vielleicht' },
];
/** Indices into `GOETTI_OPTIONS`. */
export const GOETTI_ANSWER = { yes: 0, no: 1, maybe: 2 } as const;

/** While the viewer decides: the toddler bounces hopefully, eyes twinkling. */
export function goettiIdle(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { kid } = cast;
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => {
    kid.root.position.y = Math.abs(Math.sin(elapsed * 4)) * 0.05;
    const sparkle = (index: number) => Math.max(0, Math.sin(elapsed * 2.5 + index * 1.4)) ** 10 * 0.25;
    twinkleEyes(cast, [sparkle(0), sparkle(1)]);
    everyoneLooksAt(cast, ALAIN_SPOT_WORLD);
    turnHeadTowards(kid.head, FAMILY_WORLD_YAW, ALAIN_SPOT_WORLD, 1.0);
    hopForJoy(cast.moana, elapsed);
  }, ease.linear);
  timeline.at(4, () => world.callouts.say('Bitte, bitte, bitte!', kid.head, 2.5, 0.45));
  return timeline;
}

function holdFamilyShot(timeline: Timeline, world: World, cast: FamilyCast, duration: number): void {
  const local = new Vector3();
  const target = new Vector3();
  direct(timeline, world, [
    {
      until: duration,
      view: 'walker',
      fov: 50,
      frame: () => aim(world, ALAIN_SPOT_WORLD, sideStreetToWorld(local.copy(cast.pram.root.position).setY(1.0), target)),
    },
  ]);
}

/** Ja: fanfare, confetti, cheering — and a first family photo. */
export function yesEnding(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts, sounds } = world;
  const { kid, papa, mama, moana, confetti } = cast;
  timeline.at(0.2, () => {
    sounds.fanfare();
    callouts.show('JUHUIII!', kid.head, 2, 0.5);
  });
  const random = Math.random;
  const drops = confetti.map((piece) => ({
    piece,
    start: new Vector3(63 + random() * 5, 3.5 + random() * 2, 7 + random() * 3.2),
    speed: 0.6 + random() * 0.5,
    spin: 3 + random() * 5,
  }));
  timeline.tween(0.2, 7.5, (_progress, elapsed) => {
    drops.forEach(({ piece, start, speed, spin }) => {
      piece.visible = true;
      piece.position.set(
        start.x + Math.sin(elapsed * 2 + start.z) * 0.25,
        Math.max(0.12, start.y - elapsed * speed),
        start.z,
      );
      piece.rotation.set(elapsed * spin, elapsed * spin * 0.7, 0);
    });
    kid.wavingArm.rotation.set(2.6, 0, Math.sin(elapsed * 10) * 0.4);
    kid.root.position.y = Math.abs(Math.sin(elapsed * 6)) * 0.08;
    moana.root.position.y = 0.1 + Math.abs(Math.sin(elapsed * 5)) * 0.15;
  }, ease.linear);
  timeline.tween(0.8, 0.5, (progress) => {
    [papa, mama].forEach((parent) => {
      parent.arms.forEach((arm) => {
        arm.rotation.x = lerp(-1.2, -2.9, progress);
      });
    });
  });
  timeline.at(1.6, () => callouts.say('Götti Alain! Götti Alain!', kid.head, 3, 0.45));
  timeline.tween(3.6, 0.4, (progress) => {
    papa.arms.forEach((arm) => {
      arm.rotation.x = lerp(-2.9, -1.5, progress);
    });
  });
  timeline.at(4.2, () => {
    sounds.cameraShutter();
    callouts.show('KLICK!', papa.head, 1, 0.4);
  });
  timeline.at(5.2, () => callouts.say('Wir freuen uns riesig! 💛', mama.head, 2.6, 0.45));

  // ── Fist pump, all together — Alain's fist rises into view too ─────────────
  const pumpStart = FIST_PUMP_START;
  const pumpSeconds = FIST_PUMPS * FIST_PUMP_PERIOD;
  const pump = (elapsed: number) => Math.abs(Math.sin((elapsed / FIST_PUMP_PERIOD) * Math.PI));
  timeline.tween(pumpStart, pumpSeconds + 1, (_progress, elapsed) => {
    const isPumping = elapsed < pumpSeconds;
    const height = isPumping ? pump(elapsed) : 0;
    papa.arms[1].rotation.set(-2.5 - height * 0.5, 0, -0.2);
    mama.arms[1].rotation.set(-2.5 - height * 0.5, 0, -0.2);
    moana.arms[0].rotation.set(-2.6 - height * 0.4, 0, 0.2);
    kid.wavingArm.rotation.set(0.2 - height * 0.3, 0, 0);
    world.hands.keyHand.position.y = lerp(-0.34, -0.08, Math.min(1, elapsed / 0.4)) + height * 0.08;
  }, ease.linear);
  for (let pumpIndex = 0; pumpIndex < FIST_PUMPS; pumpIndex++) {
    timeline.at(pumpStart + (pumpIndex + 0.5) * FIST_PUMP_PERIOD, () => sounds.bonk());
  }
  timeline.at(pumpStart + 0.3, () => callouts.show('YESSS!', world.thoughts, 1.6, 0.2));
  timeline.at(pumpStart + pumpSeconds, () => {
    sounds.fanfare();
    callouts.show('GÖTTI-TEAM! ✊', kid.head, 2.2, 0.6);
  });
  holdFamilyShot(timeline, world, cast, pumpStart + pumpSeconds + 2.5);
  return timeline;
}

/** Vielleicht: eyes narrow to a very cool squint, "I'll ask again tomorrow." */
export function maybeEnding(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts } = world;
  const { kid, papa } = cast;
  const wideEyes = kid.eyes[0].scale.x;
  timeline.tween(0.3, 2.2, (progress) => {
    kid.eyes.forEach((eye) => eye.scale.set(wideEyes, lerp(wideEyes, 0.35, progress), wideEyes));
  }, ease.inOut);
  timeline.at(2.7, () => callouts.say('Hmm. Ich frag morgen nochmal. 😎', kid.head, 3.5, 0.45));
  timeline.tween(3.2, 1.2, (progress) => {
    papa.arms.forEach((arm, index) => {
      arm.rotation.set(-0.4, 0, (index === 0 ? 1 : -1) * Math.sin(progress * Math.PI) * 0.7);
    });
    papa.head.rotation.z = Math.sin(progress * Math.PI) * 0.3;
  }, ease.linear);
  moanaBite(timeline, world, cast, 5);
  holdFamilyShot(timeline, world, cast, 8);
  return timeline;
}

function cry(cast: FamilyCast, elapsed: number): void {
  const { kid, tears } = cast;
  kid.whistleMouth.scale.set(1.6, 1.0 + Math.sin(elapsed * 12) * 0.25, 0.6);
  tears.forEach((tear, index) => {
    const fall = ((elapsed * 1.6 + index * 0.4) % 1);
    tear.visible = true;
    tear.position.set(kid.eyes[index].position.x * 1.3, kid.eyes[index].position.y - fall * 0.3, 0.19);
  });
}

/** Nein: the bottom lip trembles … BUÄÄÄH. */
export function noReaction(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts, sounds } = world;
  const { kid, papa, mama } = cast;
  timeline.at(0.3, () => {
    sounds.sob();
    callouts.show('BUÄÄÄH!', kid.head, 2.4, 0.5);
  });
  timeline.tween(0.3, 6, (_progress, elapsed) => cry(cast, elapsed), ease.linear);
  timeline.tween(2.2, 0.5, (progress) => {
    papa.arms.forEach((arm, index) => {
      arm.rotation.set(lerp(-1.2, -2.7, progress), 0, (index === 0 ? -1 : 1) * progress * 0.9);
    });
  });
  timeline.at(3.6, () => callouts.say('Er meint es nicht so … oder?', mama.head, 2.6, 0.45));
  holdFamilyShot(timeline, world, cast, 6.3);
  return timeline;
}

export const SURE_QUESTION = 'Sicher? 🥺';
export const SURE_OPTIONS: readonly ChoiceOption[] = [{ icon: '🤔', label: 'Nochmal überlegen' }];

export function cryingIdle(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => cry(cast, elapsed), ease.linear);
  for (let sobTime = 3; sobTime < 60; sobTime += 4) {
    timeline.at(sobTime, () => world.sounds.sob());
  }
  return timeline;
}

/** Tears dry, a big sniff, hopeful eyes again. */
export function calmDown(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { kid, papa, tears } = cast;
  timeline.at(0.2, () => {
    tears.forEach((tear) => {
      tear.visible = false;
    });
    kid.whistleMouth.scale.copy(KID_MOUTH_OPEN);
    world.callouts.show('SCHNIEF.', kid.head, 1.4, 0.5);
  });
  timeline.tween(0.4, 0.5, (progress) => {
    papa.arms.forEach((arm) => {
      arm.rotation.set(lerp(-2.7, -1.2, progress), 0, 0);
    });
  });
  timeline.at(1.4, () => world.sounds.ping(3400));
  timeline.tween(1.4, 0.6, (progress) => {
    const sparkle = Math.sin(progress * Math.PI) * 0.3;
    twinkleEyes(cast, [sparkle, sparkle]);
  }, ease.linear);
  holdFamilyShot(timeline, world, cast, 2.8);
  return timeline;
}
