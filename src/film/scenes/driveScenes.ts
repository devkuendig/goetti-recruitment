import { CatmullRomCurve3, MathUtils, Vector3, type Group } from 'three';
import { createSparkle } from '../assets/b05';
import {
  createBanana,
  createBananaPeel,
  createBananaTruck,
  scatterBananas,
  setHazardLights,
  type BananaTruck,
} from '../assets/bananas';
import { CITY, sideStreetToWorld } from '../assets/city';
import {
  createCyclist,
  createPasserby,
  createRollator,
  pedal,
  turnHeadTowards,
  walkCycle,
  type Cyclist,
  type Passerby,
} from '../assets/people';
import { createSnail, type Snail } from '../assets/streetFurniture';
import { setOutlineThickness } from '../engine/build';
import { cruiseProgress } from '../engine/route';
import type { ChoiceOption } from '../engine/story';
import { ease, lerp, Timeline } from '../engine/timeline';
import {
  aim,
  direct,
  driverCamera,
  EYE_HEIGHT,
  OUTLINE,
  placeCar,
  POV_FOV,
  STOPS,
  ZEBRA_X,
  type World,
} from './world';

const IDLE_SECONDS = 3600;
/** Characters face +z at yaw 0; -π/2 turns them towards -x (towards the oncoming B05). */
const FACING_CAR = -Math.PI / 2;
const FACING_ACROSS = 0;

// ── Cyclists ────────────────────────────────────────────────────────────────

export interface CyclistCast {
  /** Two friends chatting in the lane right in front of the garage exit. */
  chatters: [Cyclist, Cyclist];
  /** E-bike rowdy: overtakes on the left, cuts in front of the B05, shaves past grandma. */
  rider: Cyclist;
}

/**
 * Side by side across Alain's lane a few metres past the garage turn, bikes pointing opposite
 * ways — face to face.
 */
const CHATTER_SPOTS = [new Vector3(-53.2, 0, 5.3), new Vector3(-52.8, 0, 3.9)];
/** Cyclists face -x in local space: yaw π turns them towards +x, 0 towards -x. */
const CHATTER_YAWS = [Math.PI, 0];
/** The B05 swings this far out (towards -z) to get round them … */
const CHATTER_SWERVE_WIDTH = 2.6;
/** … between these beat seconds of `driveToCrossing` (car passes them at ≈ 5 s). */
const CHATTER_SWERVE_START = 3.2;
const CHATTER_SWERVE_SECONDS = 3.8;

export function createCyclistCast(world: World): CyclistCast {
  const { scene } = world.stage;
  const chatters: [Cyclist, Cyclist] = [
    createCyclist(0x2fa4d9, { shirt: 0xffd84a, trousers: 0x2f4f7f, hair: 0x8a5a2c, hairStyle: 'ponytail', backpack: 0x6cc070 }),
    createCyclist(0xe2453b, { shirt: 0x6cc070, trousers: 0x222228, hair: 0x1c1c1c, hairStyle: 'short', glasses: true }),
  ];
  chatters.forEach((chatter, index) => {
    chatter.root.position.copy(CHATTER_SPOTS[index]);
    chatter.root.rotation.y = CHATTER_YAWS[index];
    pedal(chatter, 0);
  });
  const rider = createCyclist(0xf2c230, { shirt: 0xff4f8a, trousers: 0x222228, hair: 0xc98a3a, hairStyle: 'short', headband: 0x39c0e0 });
  rider.root.visible = false;
  [...chatters, rider].forEach((cyclist) => {
    setOutlineThickness(cyclist.root, OUTLINE.character);
    scene.add(cyclist.root);
  });
  return { chatters, rider };
}

/** Faces a cyclist along a ground direction (x/z). */
function faceAlong(cyclist: Cyclist, direction: Vector3): void {
  cyclist.root.rotation.y = Math.atan2(direction.z, -direction.x);
}

/** The rider sits turned a quarter towards the bike's front; heads turn relative to that. */
function riderYaw(cyclist: Cyclist): number {
  return cyclist.root.rotation.y - Math.PI / 2;
}

const otherHead = new Vector3();

/**
 * Two cyclists stand in the lane chatting and don't even look up; the B05 simply swings round
 * them in an arc. Add right after the clip that drives the car — it nudges the car sideways.
 */
function chattersInTheWay(timeline: Timeline, world: World, cast: CyclistCast): void {
  const { callouts, b05 } = world;
  const [talker, listener] = cast.chatters;
  // Looking at each other; the talker's hands fly, the listener nods — then laughs.
  timeline.tween(0, 9, (_progress, elapsed) => {
    turnHeadTowards(talker.rider.head, riderYaw(talker), listener.rider.head.getWorldPosition(otherHead), 1.3);
    turnHeadTowards(listener.rider.head, riderYaw(listener), talker.rider.head.getWorldPosition(otherHead), 1.3);
    talker.rider.arms[1].rotation.set(-1.5 - Math.abs(Math.sin(elapsed * 5)) * 0.8, 0, Math.sin(elapsed * 3) * 0.4);
    talker.rider.arms[0].rotation.set(-1.3 - Math.abs(Math.sin(elapsed * 4 + 1)) * 0.6, 0, 0);
    const isLaughing = elapsed > 5.4 && elapsed < 7;
    listener.rider.head.rotation.x = isLaughing ? -0.25 : Math.sin(elapsed * 6) * 0.15;
    listener.rider.head.rotation.z = isLaughing ? Math.sin(elapsed * 25) * 0.12 : 0;
  }, ease.linear);
  timeline.at(1.4, () => callouts.say('… und dänn hät sie gseit …', talker.rider.head, 1.8, 0.4));
  timeline.at(3, () => callouts.say('Nei, würkli?! 😮', listener.rider.head, 1.4, 0.4));
  timeline.at(4.3, () => callouts.say('Doch! Und dänn …', talker.rider.head, 1.4, 0.4));
  timeline.at(5.5, () => callouts.say('Hahaha! 😂', listener.rider.head, 1.2, 0.4));

  // Round them in an arc: out to the left, nose leading, and back into the lane.
  timeline.tween(CHATTER_SWERVE_START, CHATTER_SWERVE_SECONDS, (progress) => {
    b05.root.position.z -= CHATTER_SWERVE_WIDTH * Math.sin(progress * Math.PI);
    b05.root.rotation.y += 0.22 * Math.sin(progress * Math.PI * 2);
  }, ease.linear);
}


// Rowdy rider: from behind-left past the B05, cutting across its nose, then right past grandma.
const ROWDY_APPEARS = 15.5;
const ROWDY_RIDE_SECONDS = 4.5;
const ROWDY_ROUTE = new CatmullRomCurve3([
  new Vector3(6, 0, 1.4),
  new Vector3(19, 0, 1.8),
  new Vector3(25, 0, 5.4),
  new Vector3(ZEBRA_X, 0, 5.9),
  new Vector3(45, 0, 5.4),
  new Vector3(70, 0, 5.2),
]);
/** Fraction of `ROWDY_ROUTE` at which he passes grandma on the zebra crossing (≈1.5 s in). */
const ROWDY_AT_GRANDMA = 0.41;

/** Must be added after the clip that drives the car; grandma reacts as he whizzes past. */
function rowdyRider(timeline: Timeline, world: World, rider: Cyclist, crossing: CrossingCast): void {
  const { callouts, thoughts, sounds } = world;
  const direction = new Vector3();
  const passGrandma = ROWDY_APPEARS + ROWDY_AT_GRANDMA * ROWDY_RIDE_SECONDS;
  timeline.at(ROWDY_APPEARS, () => {
    rider.root.visible = true;
  });
  timeline.tween(ROWDY_APPEARS, ROWDY_RIDE_SECONDS, (progress, elapsed) => {
    rider.root.position.copy(ROWDY_ROUTE.getPointAt(progress));
    faceAlong(rider, ROWDY_ROUTE.getTangentAt(progress, direction));
    pedal(rider, elapsed * 12);
  }, ease.linear);
  timeline.at(ROWDY_APPEARS + 0.2, () => {
    sounds.bikeBell();
    callouts.show('DRING DRING!', rider.rider.head, 1.2, 0.4);
  });
  timeline.at(ROWDY_APPEARS + 0.7, () => {
    sounds.whoosh();
    callouts.say('Hey!! 😱', thoughts, 1.4, 0);
  });
  timeline.tween(passGrandma - 0.1, 0.5, (progress) => {
    crossing.grandma.head.rotation.y = lerp(0, -1, Math.sin(progress * Math.PI));
    crossing.grandma.root.position.y = Math.sin(progress * Math.PI) * 0.15;
  }, ease.linear);
  timeline.at(passGrandma, () => {
    sounds.whoosh();
    callouts.say('Saucheib!', crossing.grandma.head, 1.3);
  });
  timeline.at(ROWDY_APPEARS + ROWDY_RIDE_SECONDS, () => {
    rider.root.visible = false;
  });
}

// ── Crossing ────────────────────────────────────────────────────────────────

export interface CrossingCast {
  grandma: Passerby;
  rollator: Group;
  snail: Snail;
}

const GRANDMA_START_Z = -1.2;
const ROLLATOR_AHEAD = 0.5;

export function createCrossingCast(world: World): CrossingCast {
  const { scene } = world.stage;
  const grandma = createPasserby({
    shirt: 0xb48ad8,
    trousers: 0x5a5a62,
    hair: 0xeeeeee,
    hairStyle: 'bun',
    glasses: true,
    bag: 0xd94a6a,
  });
  grandma.arms.forEach((arm) => {
    arm.rotation.x = -0.9;
  });
  const rollator = createRollator();
  const snail = createSnail();
  snail.root.visible = false;
  [grandma.root, rollator, snail.root].forEach((root) => {
    setOutlineThickness(root, OUTLINE.character);
    scene.add(root);
  });
  const cast = { grandma, rollator, snail };
  placeGrandma(cast, GRANDMA_START_Z, FACING_ACROSS);
  return cast;
}

/** Grandma walks along z on the zebra crossing, slightly hunched, the rollator ahead of her. */
function placeGrandma(cast: CrossingCast, z: number, yaw: number): void {
  const { grandma, rollator } = cast;
  grandma.root.position.set(ZEBRA_X, 0, z);
  grandma.root.rotation.set(0.15, yaw, 0, 'YXZ');
  rollator.position.set(ZEBRA_X, 0, z + ROLLATOR_AHEAD);
}

function shuffle(cast: CrossingCast, phase: number): void {
  walkCycle(cast.grandma, phase, 0.15);
  cast.grandma.arms.forEach((arm) => {
    arm.rotation.x = -0.9;
  });
}

/**
 * Out of the garage, right into Zürcherstrasse, past the Migros — and at the zebra crossing a
 * grandma with her rollator has been crossing since breakfast. One cut-away from the far sidewalk.
 */
export function driveToCrossing(world: World, cast: CrossingCast, cyclists: CyclistCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds, b05 } = world;
  const startDistance = world.odometer;
  const duration = 20;

  timeline.at(0.2, () => sounds.electricWhir(5));
  timeline.tween(0, duration, (_progress, elapsed) => {
    placeCar(world, lerp(startDistance, STOPS.crossing, cruiseProgress(elapsed, duration, 5, 4)));
  }, ease.linear);
  timeline.tween(0, duration, (progress, elapsed) => {
    const z = lerp(GRANDMA_START_Z, 2.9, progress);
    placeGrandma(cast, z, FACING_ACROSS);
    shuffle(cast, elapsed * 3);
  }, ease.linear);
  timeline.at(12, () => callouts.say('Ah, die Migros. Bananen kaufen? Später …', thoughts, 3, 0));
  timeline.at(18, () => callouts.say('Oh … da will jemand über die Strasse.', thoughts, 2.2, 0));
  rowdyRider(timeline, world, cyclists.rider, cast);
  chattersInTheWay(timeline, world, cyclists);

  const carTarget = new Vector3();
  const sidewalkCamera = new Vector3(-14, 1.0, -7.4);
  const driverFrame = () => {
    // Look into the right turn, glance left at the Migros, otherwise straight ahead.
    const distance = world.odometer;
    const turnLook = -0.35 * Math.sin(Math.PI * MathUtils.clamp((distance - 3) / 10, 0, 1));
    const carX = b05.root.position.x;
    const migrosLook = 0.25 * Math.sin(Math.PI * MathUtils.clamp((carX - 4) / 18, 0, 1));
    driverCamera(world, turnLook + migrosLook);
  };
  direct(timeline, world, [
    { until: 9, view: 'driver', fov: POV_FOV, frame: driverFrame },
    {
      until: 12,
      view: 'free',
      fov: 40,
      frame: () => {
        carTarget.copy(b05.root.position).setY(0.8);
        aim(world, sidewalkCamera, carTarget);
      },
    },
    { until: duration + 0.5, view: 'driver', fov: POV_FOV, frame: driverFrame },
  ]);
  return timeline;
}

export const CROSSING_QUESTION = 'Eine Grossmutter überquert die Strasse – im Schneckentempo. Was tust du?';
export const CROSSING_OPTIONS: readonly ChoiceOption[] = [
  { icon: '📯', label: 'Hupen' },
  { icon: '👉', label: 'Mit dem Auto anstupsen' },
  { icon: '🐌', label: 'Geduldig warten' },
];

/** While the viewer decides, grandma inches forward a few centimetres. */
export function crossingIdle(cast: CrossingCast): Timeline {
  const timeline = new Timeline();
  const startZ = cast.grandma.root.position.z;
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => {
    placeGrandma(cast, Math.min(startZ + elapsed * 0.04, startZ + 0.6), FACING_ACROSS);
    shuffle(cast, elapsed * 3);
  }, ease.linear);
  return timeline;
}

function turnGrandma(timeline: Timeline, cast: CrossingCast, start: number, from: number, to: number): void {
  timeline.tween(start, 0.9, (progress) => {
    placeGrandma(cast, cast.grandma.root.position.z, lerp(from, to, progress));
  });
}

function driverOnly(timeline: Timeline, world: World, duration: number, shake: (elapsed: number) => number = () => 0): void {
  direct(timeline, world, [
    {
      until: duration,
      view: 'driver',
      fov: POV_FOV,
      frame: (elapsed) => {
        driverCamera(world);
        world.stage.camera.position.y += shake(elapsed);
      },
    },
  ]);
}

function hornReaction(world: World, cast: CrossingCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds } = world;
  const { grandma } = cast;
  const z = grandma.root.position.z;
  timeline.at(0.4, () => {
    sounds.horn();
    callouts.show('TÜÜÜT!', thoughts, 1.4, -0.2);
  });
  timeline.tween(0.5, 0.5, (progress) => {
    grandma.root.position.y = Math.sin(progress * Math.PI) * 0.3;
    grandma.arms.forEach((arm) => {
      arm.rotation.x = lerp(-0.9, -2.6, Math.sin(progress * Math.PI));
    });
  }, ease.linear);
  turnGrandma(timeline, cast, 1.3, FACING_ACROSS, FACING_CAR);
  timeline.at(2.2, () => callouts.say('Saucheib!', grandma.head, 1.2));
  timeline.at(3.4, () => callouts.say('Junger Mann! Ich bin zweiundneunzig!', grandma.head, 2.6));
  timeline.tween(2.4, 2.6, (_progress, elapsed) => {
    grandma.arms[1].rotation.set(-2.8, 0, Math.sin(elapsed * 14) * 0.3);
  }, ease.linear);
  timeline.tween(5, 0.3, (progress) => {
    grandma.arms[1].rotation.set(lerp(-2.8, -0.9, progress), 0, 0);
  });
  turnGrandma(timeline, cast, 5.3, FACING_CAR, FACING_ACROSS);
  // … and now on purpose even slower.
  timeline.tween(6.2, 1.8, (progress, elapsed) => {
    placeGrandma(cast, z + progress * 0.15, FACING_ACROSS);
    shuffle(cast, elapsed * 1.5);
  }, ease.linear);
  driverOnly(timeline, world, 8);
  return timeline;
}

function nudgeReaction(world: World, cast: CrossingCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds } = world;
  const { grandma } = cast;
  const startDistance = world.odometer;
  const z = grandma.root.position.z;
  timeline.tween(0.4, 1.6, (_progress, elapsed) => {
    placeCar(world, lerp(startDistance, startDistance + 1.9, cruiseProgress(elapsed, 1.6, 0.6, 0.6)));
  }, ease.linear);
  timeline.at(2, () => {
    sounds.plop();
    callouts.show('STUPS!', grandma.root, 1.2, 1.1);
  });
  timeline.tween(2, 0.5, (progress) => {
    placeGrandma(cast, z + Math.sin(progress * Math.PI) * 0.25, FACING_ACROSS);
    grandma.root.rotation.x = 0.15 + Math.sin(progress * Math.PI) * 0.35;
  }, ease.out);
  turnGrandma(timeline, cast, 2.7, FACING_ACROSS, FACING_CAR);
  // Two whacks with the handbag on the bonnet.
  for (const whackTime of [3.7, 4.7]) {
    timeline.tween(whackTime, 0.5, (progress) => {
      grandma.arms[0].rotation.x = progress < 0.6 ? lerp(-0.9, -2.7, progress / 0.6) : lerp(-2.7, -0.6, (progress - 0.6) / 0.4);
    }, ease.linear);
    timeline.at(whackTime + 0.5, () => {
      sounds.bonk();
      callouts.show('BONK!', thoughts, 0.9, -0.5);
    });
  }
  timeline.at(3.1, () => callouts.say('Saucheib!', grandma.head, 1.2));
  timeline.at(5.5, () => callouts.say('Also wirklich! Frechheit!', grandma.head, 2.5));
  turnGrandma(timeline, cast, 7, FACING_CAR, FACING_ACROSS);
  driverOnly(timeline, world, 8.2, (elapsed) => {
    const sinceWhack = Math.min(...[4.2, 5.2].map((time) => (elapsed >= time ? elapsed - time : Number.POSITIVE_INFINITY)));
    return sinceWhack < 0.35 ? Math.sin(sinceWhack * 60) * 0.02 * (1 - sinceWhack / 0.35) : 0;
  });
  return timeline;
}

function waitReaction(world: World, cast: CrossingCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds } = world;
  const { grandma, snail } = cast;
  const z = grandma.root.position.z;
  const snailStartZ = z - 1.6;
  snail.root.position.set(ZEBRA_X - 0.7, 0.02, snailStartZ);
  snail.root.visible = true;
  timeline.at(0.5, () => callouts.say('Ich warte gern. 🙂', thoughts, 2.2, 0));
  timeline.tween(0, 8, (_progress, elapsed) => {
    snail.root.position.z = snailStartZ + elapsed * 0.45;
    snail.stalks.forEach((stalk, index) => {
      stalk.rotation.x = Math.sin(elapsed * 6 + index) * 0.25;
    });
  }, ease.linear);
  timeline.at(3.3, () => {
    sounds.whoosh();
    callouts.show('WUSCH!', snail.root, 1.2, 0.3);
  });
  timeline.tween(4, 0.6, (progress) => {
    grandma.head.rotation.y = lerp(0, -0.8, progress);
  });
  timeline.at(4.3, () => callouts.say('Hoppla – die Schnecke überholt mich!', grandma.head, 2.4));
  timeline.tween(5.8, 0.4, (progress) => {
    grandma.head.rotation.y = lerp(-0.8, 0, progress);
  });
  turnGrandma(timeline, cast, 5.8, FACING_ACROSS, FACING_CAR);
  timeline.tween(6.8, 2, (_progress, elapsed) => {
    grandma.arms[1].rotation.set(-2.7, 0, Math.sin(elapsed * 10) * 0.35);
  }, ease.linear);
  timeline.at(6.8, () => {
    callouts.say('Merci vielmal, junger Mann! 💐', grandma.head, 2.6);
    callouts.show('+1 KARMA', thoughts, 1.8, -0.3);
    sounds.ping(2800);
  });
  timeline.tween(8.8, 0.3, (progress) => {
    grandma.arms[1].rotation.set(lerp(-2.7, -0.9, progress), 0, 0);
  });
  turnGrandma(timeline, cast, 9.1, FACING_CAR, FACING_ACROSS);
  driverOnly(timeline, world, 10.2);
  return timeline;
}

export const CROSSING_REACTIONS: readonly ((world: World, cast: CrossingCast) => Timeline)[] = [
  hornReaction,
  nudgeReaction,
  waitReaction,
];

// ── Banana truck ────────────────────────────────────────────────────────────

export interface BananaCast {
  truck: BananaTruck;
  driver: Passerby;
  /** Bananas on the near lanes — these get collected. */
  roadBananas: Group[];
  /** For the "eat them all myself" gag. */
  peel: Group;
}

const TRUCK_POSITION = new Vector3(48, 0, -4.6);
const DRIVER_SPOT = new Vector3(44, 0, 1.6);
const DRIVER_YAW = FACING_CAR + 0.5;

/** The whole banana scene lives round the corner, in the side street's street frame. */
export function createBananaCast(world: World): BananaCast {
  const scene = world.city.sideStreet;
  const truck = createBananaTruck();
  truck.root.position.copy(TRUCK_POSITION);
  setOutlineThickness(truck.root, OUTLINE.background);
  const roadBananas = scatterBananas(30, { minX: 41.5, maxX: 50, minZ: -0.3, maxZ: 6 }, 7);
  // The rest of the load spilled out of the open rear doors into a mound in the middle of the
  // road — clear of the B05's lane, so it stays there.
  const heap = scatterBananas(90, { minX: 50.5, maxX: 56, minZ: -0.6, maxZ: 2.8 }, 11, 0.9);
  const driver = createPasserby({
    shirt: 0xff8a1e,
    trousers: 0x2f4f7f,
    hair: 0x4a2f1b,
    hairStyle: 'hat',
    beard: true,
  });
  driver.root.position.copy(DRIVER_SPOT);
  driver.root.rotation.y = DRIVER_YAW;
  const peel = createBananaPeel();
  peel.visible = false;
  setOutlineThickness(driver.root, OUTLINE.character);
  scene.add(truck.root, driver.root, peel, ...roadBananas, ...heap);
  return { truck, driver, roadBananas, peel };
}

/** Runs for the whole film: hazard lights blink, the driver scratches his head. Beats override it. */
export function bananaLife(cast: BananaCast): Timeline {
  const timeline = new Timeline();
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => {
    setHazardLights(cast.truck, elapsed % 1 < 0.5);
    cast.driver.arms[1].rotation.set(-2.9, 0, Math.sin(elapsed * 9) * 0.15);
  }, ease.linear);
  return timeline;
}

const WIDE_BANANA_CAMERA = sideStreetToWorld(new Vector3(35.5, 3.4, 9.6));
const WIDE_BANANA_TARGET = sideStreetToWorld(new Vector3(46, 0.6, 0));
const BANANA_DRIVE_START = 3;
const BANANA_DRIVE_SECONDS = 9;

/** Grandma reaches the sidewalk, Alain turns right into the side street — and there it lies. */
export function driveToBananas(world: World, cast: CrossingCast, bananas: BananaCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds } = world;
  const grandmaZ = cast.grandma.root.position.z;
  const startDistance = world.odometer;
  // Grandma finally makes it to the sidewalk.
  timeline.tween(0, 5, (progress, elapsed) => {
    placeGrandma(cast, lerp(grandmaZ, CITY.curbZ + 1.2, progress), FACING_ACROSS);
    shuffle(cast, elapsed * 4);
  }, ease.linear);
  timeline.at(BANANA_DRIVE_START, () => sounds.electricWhir(BANANA_DRIVE_SECONDS - 2));
  timeline.tween(BANANA_DRIVE_START, BANANA_DRIVE_SECONDS, (_progress, elapsed) => {
    placeCar(world, lerp(startDistance, STOPS.bananas, cruiseProgress(elapsed, BANANA_DRIVE_SECONDS, 2, 3)));
  }, ease.linear);
  const alarmTime = BANANA_DRIVE_START + BANANA_DRIVE_SECONDS;
  timeline.at(alarmTime - 3.2, () => callouts.say('Was ist denn da passiert?!', thoughts, 2.5, 0));
  timeline.at(alarmTime + 0.2, () => callouts.show('BANANEN-ALARM!', bananas.truck.root, 2, 3.2));
  const sideTurnLength = STOPS.sideTurnEnd - STOPS.sideTurnStart;
  direct(timeline, world, [
    {
      until: alarmTime,
      view: 'driver',
      fov: POV_FOV,
      frame: (elapsed) => {
        // A last glance right at grandma, then a look into the right turn.
        const grandmaLook = -0.4 * Math.max(0, 1 - elapsed / 3);
        const turnLook = -0.45 * Math.sin(Math.PI * MathUtils.clamp((world.odometer - STOPS.sideTurnStart + 3) / (sideTurnLength + 3), 0, 1));
        driverCamera(world, grandmaLook + turnLook);
      },
    },
    { until: alarmTime + 3.5, view: 'free', fov: 50, frame: () => aim(world, WIDE_BANANA_CAMERA, WIDE_BANANA_TARGET) },
  ]);
  return timeline;
}

export const BANANA_QUESTION = 'Ein Lastwagen voller Bananen ist umgekippt! Was willst du machen?';
export const BANANA_OPTIONS: readonly ChoiceOption[] = [
  { icon: '🐒', label: 'Bananen einsammeln für einen Affen-Zoo im Wohnzimmer' },
  { icon: '💛', label: 'Bananen einsammeln für Moana' },
  { icon: '🍞', label: 'Bananen einsammeln für Bananenbrot' },
];

function wideBananaShot(timeline: Timeline, world: World, duration: number): void {
  direct(timeline, world, [
    { until: duration, view: 'free', fov: 50, frame: () => aim(world, WIDE_BANANA_CAMERA, WIDE_BANANA_TARGET) },
  ]);
}

/** Speech from inside the car: bubble above the B05. */
function alainSays(world: World, text: string, durationSeconds: number): void {
  world.callouts.say(text, world.b05.root, durationSeconds, 2.1);
}

function monkeyZooReaction(world: World, cast: BananaCast): Timeline {
  const timeline = new Timeline();
  const sparkles = cast.roadBananas.slice(0, 4).map((banana) => {
    const sparkle = createSparkle();
    sparkle.position.copy(banana.position).setY(0.25);
    world.city.sideStreet.add(sparkle);
    return sparkle;
  });
  timeline.at(0.5, () => alainSays(world, 'Damit eröffne ich einen Affen-Zoo im Wohnzimmer! 🐒', 3.5));
  timeline.at(2.4, () => world.sounds.ping(2600));
  timeline.tween(2.4, 1, (progress) => {
    sparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin((progress * 1.5 - index * 0.12) * Math.PI)) * 0.5);
    });
  }, ease.linear);
  timeline.at(4.3, () => world.callouts.say('Nur zu, bedien dich!', cast.driver.head, 2.2));
  wideBananaShot(timeline, world, 7);
  return timeline;
}

function forMoanaReaction(world: World, cast: BananaCast): Timeline {
  const timeline = new Timeline();
  const { driver } = cast;
  timeline.at(0.5, () => alainSays(world, 'Die bringe ich Moana – sie liebt Bananen! 💛', 3.5));
  timeline.at(4.2, () => world.callouts.say('Wer ist Moana?', driver.head, 2.4));
  timeline.tween(4.2, 0.5, (progress) => {
    driver.head.rotation.z = lerp(0, 0.35, progress);
  });
  timeline.tween(6.4, 0.4, (progress) => {
    driver.head.rotation.z = lerp(0.35, 0, progress);
  });
  wideBananaShot(timeline, world, 7.3);
  return timeline;
}

/** Bananenbrot — he tastes one first, flicks the peel out of the window and the truck driver slips on it. */
function bananaBreadReaction(world: World, cast: BananaCast): Timeline {
  const timeline = new Timeline();
  const { callouts, sounds, b05 } = world;
  const { driver, peel } = cast;
  timeline.at(0.5, () => alainSays(world, 'Bananenbrot! Aber zuerst eine probieren … 😋', 2.4));
  for (const munchTime of [1.6, 2.4]) {
    timeline.at(munchTime, () => {
      sounds.munch();
      callouts.show('MAMPF!', b05.root, 0.8, 1.8);
    });
  }
  b05.root.updateMatrixWorld();
  world.city.sideStreet.updateMatrixWorld();
  // The peel lives in the side street's frame, like the driver.
  const window = world.city.sideStreet.worldToLocal(new Vector3(-0.1, 1.2, 1.0).applyMatrix4(b05.root.matrixWorld));
  // In the middle of the road, clear of the B05's lane — he'll be lying here for a while.
  const landing = new Vector3(43.4, 0.02, 2.2);
  timeline.at(3, () => {
    peel.visible = true;
    sounds.whoosh();
  });
  timeline.tween(3, 0.9, (progress) => {
    peel.position.lerpVectors(window, landing, progress);
    peel.position.y += Math.sin(progress * Math.PI) * 1.2;
    peel.rotation.z = progress * 8;
  }, ease.linear);
  timeline.at(3.9, () => {
    peel.rotation.z = 0;
  });

  const walkFrom = DRIVER_SPOT.clone();
  const walkTo = landing.clone().setY(0);
  timeline.tween(4, 1.6, (progress) => {
    driver.root.position.lerpVectors(walkFrom, walkTo, progress);
    driver.root.rotation.y = Math.atan2(walkTo.x - walkFrom.x, walkTo.z - walkFrom.z);
    walkCycle(driver, progress * 12);
    driver.arms[1].rotation.set(0, 0, 0);
  }, ease.linear);
  timeline.at(5.6, () => {
    sounds.whoosh();
    callouts.show('WUSCH!', driver.root, 1, 0.4);
  });
  timeline.tween(5.6, 0.45, (progress) => {
    driver.root.rotation.x = lerp(0, -1.45, progress);
    driver.root.position.y = Math.sin(progress * Math.PI) * 0.4;
    driver.legs.forEach((leg) => {
      leg.rotation.x = lerp(0, -1.1, progress);
    });
    peel.position.x = landing.x - progress * 0.8;
  }, ease.in);
  timeline.at(6.05, () => {
    sounds.bonk();
    callouts.show('AUA!', driver.head, 1.4, 0.3);
    driver.dizzyStars.visible = true;
  });
  timeline.tween(6.05, 3, (_progress, elapsed) => {
    driver.dizzyStars.rotation.y = elapsed * 6;
    driver.arms[1].rotation.set(0, 0, 0);
  }, ease.linear);
  timeline.at(7, () => alainSays(world, 'Ups … Entschuldigung!', 2));
  wideBananaShot(timeline, world, 9.1);
  return timeline;
}

export const BANANA_REACTIONS: readonly ((world: World, cast: BananaCast) => Timeline)[] = [
  monkeyZooReaction,
  forMoanaReaction,
  bananaBreadReaction,
];

const ARMFUL_SIZE = 8;
const FLYER_COUNT = 24;
const FLYER_INTERVAL = 0.35;
const FLIGHT_SECONDS = 0.8;
const FLYERS_START = 4.8;
const POV_PICK_POSITION = new Vector3(41, EYE_HEIGHT, 3.2);
const POV_PICK_TARGET = new Vector3(44, 0.1, 3.4);

/**
 * Alain picks up armfuls (POV), then a wide shot where bananas fly in arcs into the boot and onto
 * the roof — he and the truck driver throwing, off-screen and on. The tailgate no longer closes.
 */
export function collectBananas(world: World, cast: BananaCast): Timeline {
  const timeline = new Timeline();
  const { callouts, sounds, b05, cargo, cockpit, stage } = world;
  const { driver, roadBananas, peel } = cast;

  // Whatever happened before: the driver gets back on his feet, the peel goes in the bin.
  const fallenTilt = driver.root.rotation.x;
  const fallenLegs = driver.legs.map((leg) => leg.rotation.x);
  const driverPosition = driver.root.position.clone();
  peel.visible = false;
  timeline.tween(0, 1, (progress) => {
    driver.root.rotation.x = lerp(fallenTilt, 0, progress);
    driver.root.position.y = 0;
    driver.legs.forEach((leg, index) => {
      leg.rotation.x = lerp(fallenLegs[index], 0, progress);
    });
  });
  timeline.at(1, () => {
    driver.dizzyStars.visible = false;
  });

  // ── POV: an armful of bananas grows in front of Alain ───────────────────────
  const byDistance = [...roadBananas].sort(
    (first, second) => first.position.distanceTo(POV_PICK_POSITION) - second.position.distanceTo(POV_PICK_POSITION),
  );
  const picked = byDistance.slice(0, ARMFUL_SIZE);
  const thrown = byDistance.slice(ARMFUL_SIZE);
  const armful = picked.map((_banana, index) => {
    const held = createBanana();
    held.position.set((index % 3) * 0.12 - 0.12, -0.42 + Math.floor(index / 3) * 0.05, -0.6);
    held.rotation.y = index * 0.7;
    held.visible = false;
    stage.camera.add(held);
    return held;
  });
  picked.forEach((banana, index) => {
    const pickTime = 0.8 + index * 0.4;
    timeline.at(pickTime, () => {
      banana.visible = false;
      armful[index].visible = true;
      sounds.plop();
    });
  });
  timeline.at(1.2, () => callouts.show('HOPP!', world.thoughts, 0.8, -0.2));
  timeline.at(2.6, () => callouts.show('HOPP!', world.thoughts, 0.8, -0.2));
  timeline.at(FLYERS_START - 0.3, () => armful.forEach((held) => held.removeFromParent()));

  // ── Wide: bananas fly into the car ──────────────────────────────────────────
  // Flight paths are worked out in the side street's frame, where the road bananas lie.
  const { sideStreet } = world.city;
  b05.root.updateMatrixWorld();
  sideStreet.updateMatrixWorld();
  const slots = cargo.bananas.map((banana) => sideStreet.worldToLocal(banana.getWorldPosition(new Vector3())));
  const flyers = Array.from({ length: FLYER_COUNT }, () => {
    const flyer = createBanana();
    flyer.visible = false;
    sideStreet.add(flyer);
    return flyer;
  });
  const alainThrowSpot = new Vector3(41.5, 1.2, 6.8);
  flyers.forEach((flyer, index) => {
    const launch = FLYERS_START + index * FLYER_INTERVAL;
    const source = thrown[index]?.position.clone() ?? (index % 2 === 0 ? driverPosition.clone().setY(1.3) : alainThrowSpot);
    const slot = slots[Math.min(slots.length - 1, Math.round(((index + 1) / FLYER_COUNT) * slots.length) - 1)];
    timeline.at(launch, () => {
      flyer.visible = true;
      if (thrown[index]) {
        thrown[index].visible = false;
      }
    });
    timeline.tween(launch, FLIGHT_SECONDS, (progress) => {
      flyer.position.lerpVectors(source, slot, progress);
      flyer.position.y += Math.sin(progress * Math.PI) * 2.2;
      flyer.rotation.z = progress * 9;
    }, ease.linear);
    timeline.at(launch + FLIGHT_SECONDS, () => {
      flyer.visible = false;
      const loaded = Math.round(((index + 1) / FLYER_COUNT) * cargo.bananas.length);
      cargo.bananas.slice(0, loaded).forEach((banana) => {
        banana.visible = true;
      });
      if (index % 6 === 0) {
        callouts.show('HOPP!', flyer, 0.7, 0.2);
      }
    });
  });
  // Any road banana not thrown in the montage still disappears before the car drives over it.
  timeline.at(FLYERS_START, () => {
    thrown.slice(FLYER_COUNT).forEach((banana) => {
      banana.visible = false;
    });
  });
  // The tailgate gives way bit by bit while the boot fills up.
  timeline.tween(5, 3.5, (progress) => {
    b05.tailgate.rotation.z = lerp(0, 0.3, progress);
  }, ease.out);
  // The driver tosses bananas too.
  timeline.tween(FLYERS_START, FLYER_COUNT * FLYER_INTERVAL, (_progress, elapsed) => {
    driver.root.rotation.y = DRIVER_YAW;
    driver.arms[1].rotation.set(-1.2 - Math.abs(Math.sin(elapsed * Math.PI / (FLYER_INTERVAL * 2))) * 1.4, 0, 0);
  }, ease.linear);
  const finished = FLYERS_START + FLYER_COUNT * FLYER_INTERVAL + FLIGHT_SECONDS;
  timeline.at(finished, () => {
    cargo.strap.visible = true;
    cockpit.roofBananas.visible = true;
    sounds.ping(2200);
    callouts.show('FERTIG!', b05.root, 1.5, 2.4);
  });
  timeline.at(finished + 0.6, () => callouts.say('Merci vielmal! Gute Fahrt!', driver.head, 2.6));

  const wideStart = sideStreetToWorld(new Vector3(33.5, 2.6, 9.4));
  const wideEnd = sideStreetToWorld(new Vector3(34.5, 3.0, 8.4));
  const wideTarget = sideStreetToWorld(new Vector3(39.5, 1.0, 3.2));
  const povPosition = sideStreetToWorld(POV_PICK_POSITION);
  const povTarget = sideStreetToWorld(POV_PICK_TARGET);
  const widePosition = new Vector3();
  direct(timeline, world, [
    {
      until: FLYERS_START - 0.3,
      view: 'walker',
      fov: POV_FOV,
      frame: (elapsed) => {
        const bob = Math.abs(Math.sin(elapsed * 2.5)) * 0.15;
        aim(world, povPosition.clone().setY(EYE_HEIGHT - bob), povTarget);
      },
    },
    {
      until: finished + 3.4,
      view: 'free',
      fov: 48,
      frame: (elapsed) => {
        widePosition.lerpVectors(wideStart, wideEnd, MathUtils.clamp((elapsed - FLYERS_START) / 10, 0, 1));
        aim(world, widePosition, wideTarget);
      },
    },
  ]);
  return timeline;
}
