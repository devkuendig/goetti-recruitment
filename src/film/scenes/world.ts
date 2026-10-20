import { Group, Vector3 } from 'three';
import { B05_WHEEL_RADIUS, createB05, createB05Cockpit, type B05, type B05Cockpit } from '../assets/b05';
import { createBananaCargo, type BananaCargo } from '../assets/bananas';
import { CITY, createCity, followWithSun, RAILWAY, SIDE_STREET, type City } from '../assets/city';
import { createHome, HOME, type Home } from '../assets/home';
import { createCyclist, createDog, createPasserby, createPovHands, pedal, walkCycle, type PovHands } from '../assets/people';
import { createTrain, createZebraCrossing, furnishStreet } from '../assets/streetFurniture';
import { setOutlineThickness } from '../engine/build';
import type { SoundBoard } from '../engine/audio';
import type { Callouts } from '../engine/callouts';
import { Route } from '../engine/route';
import type { Stage } from '../engine/stage';
import { ease, lerp, Timeline } from '../engine/timeline';

export const OUTLINE = { background: 0.0022, character: 0.005, cockpit: 0.003 } as const;
export const EYE_HEIGHT = 1.68;
export const POV_FOV = 60;
export const B05_PAINT = 0x2f7fe0;
/** The interactive film has no fixed length; loops and ambience simply run this long. */
const LOOP_SECONDS = 3600;
const AMBIENCE_SOUND_SECONDS = 900;

/** Out of the garage (nose first, towards the street), right turn into the outer lane, then east along Zürcherstrasse. */
const TURN_RADIUS = 4;
const TURN_END_X = HOME.garageDoorX + TURN_RADIUS;
const GARAGE_PARKED_Z = 14;
/** Centre of the outer eastbound lane. */
export const LANE_Z = CITY.laneWidth * 1.5;
const EXIT_LENGTH = GARAGE_PARKED_Z - LANE_Z - TURN_RADIUS;
/** Right turn from Zürcherstrasse into the side street, ending in its outer lane. */
const SIDE_TURN_RADIUS = 6;
const SIDE_TURN_START_X = SIDE_STREET.centerX - LANE_Z - SIDE_TURN_RADIUS;
export const ROUTE = new Route({ x: HOME.garageDoorX, z: GARAGE_PARKED_Z, heading: -Math.PI / 2 })
  .line(EXIT_LENGTH)
  .arc(TURN_RADIUS, Math.PI / 2)
  .line(SIDE_TURN_START_X - TURN_END_X)
  .arc(SIDE_TURN_RADIUS, Math.PI / 2)
  .line(SIDE_STREET.endX - SIDE_STREET.startX);
const TURN_END_DISTANCE = EXIT_LENGTH + (TURN_RADIUS * Math.PI) / 2;
const SIDE_TURN_END_DISTANCE = TURN_END_DISTANCE + (SIDE_TURN_START_X - TURN_END_X) + (SIDE_TURN_RADIUS * Math.PI) / 2;
const SIDE_TURN_END_WORLD_Z = LANE_Z + SIDE_TURN_RADIUS;

/** Route distance at which the car's centre is at `x` on the straight part of Zürcherstrasse. */
export function routeDistanceAtX(x: number): number {
  return TURN_END_DISTANCE + (x - TURN_END_X);
}

/** Route distance at which the car's centre is at street-frame `x` in the side street. */
function routeDistanceAtSideStreetX(x: number): number {
  return SIDE_TURN_END_DISTANCE + (x - SIDE_STREET.offsetX - SIDE_TURN_END_WORLD_Z);
}

export const ZEBRA_X = 32;
export const STOPS = {
  /** Nose just out on the sidewalk, still turning. */
  turnEnd: TURN_END_DISTANCE,
  crossing: routeDistanceAtX(ZEBRA_X - 4.6),
  /** Start of the right turn into the side street. */
  sideTurnStart: routeDistanceAtX(SIDE_TURN_START_X),
  sideTurnEnd: SIDE_TURN_END_DISTANCE,
  bananas: routeDistanceAtSideStreetX(38),
  parking: routeDistanceAtSideStreetX(60),
} as const;

export type View = 'driver' | 'walker' | 'free';

/** All the film's scenes need of the stage — also met by a bare scene + camera for a dry run. */
export type StageView = Pick<Stage, 'scene' | 'camera'>;

export interface World {
  stage: StageView;
  sounds: SoundBoard;
  callouts: Callouts;
  city: City;
  home: Home;
  b05: B05;
  cockpit: B05Cockpit;
  cargo: BananaCargo;
  hands: PovHands;
  /** Fixed point in front of Alain's eyes, for his thought bubbles. */
  thoughts: Group;
  /** Metres the B05 has driven along `ROUTE`. */
  odometer: number;
}

export function createWorld(stage: StageView,sounds: SoundBoard, callouts: Callouts): World {
  const { scene, camera } = stage;
  const city = createCity(scene);
  city.root.add(furnishStreet(), createZebraCrossing(ZEBRA_X));
  setOutlineThickness(city.root, OUTLINE.background);

  const home = createHome();
  scene.add(home.root);

  const b05 = createB05(B05_PAINT);
  const cargo = createBananaCargo();
  b05.root.add(cargo.root);
  scene.add(b05.root);

  const cockpit = createB05Cockpit(B05_PAINT);
  setOutlineThickness(cockpit.root, OUTLINE.cockpit);
  const hands = createPovHands();
  const thoughts = new Group();
  thoughts.position.set(0, 0.35, -2);
  camera.add(cockpit.root, hands.root, thoughts);

  const world: World = { stage, sounds, callouts, city, home, b05, cockpit, cargo, hands, thoughts, odometer: 0 };
  placeCar(world, 0);
  return world;
}

export function placeCar(world: World, distance: number): void {
  const pose = ROUTE.at(distance);
  const car = world.b05.root;
  car.position.set(pose.x, 0, pose.z);
  // Cars face -x in their local space.
  car.rotation.y = Math.atan2(Math.sin(pose.heading), -Math.cos(pose.heading));
  // Absolute, not incremental: re-applied clips must not spin the wheels any further.
  world.b05.wheels.forEach((wheel) => {
    wheel.rotation.z = distance / B05_WHEEL_RADIUS;
  });
  world.odometer = distance;
}

const DRIVER_EYE = new Vector3(0.15, 1.24, 0.38);
const lookPoint = new Vector3();

/** Camera in the driver's seat. `lookYaw` > 0 turns the head left, `lookPitch` > 0 looks up. */
export function driverCamera(world: World, lookYaw = 0, lookPitch = 0): void {
  const { camera } = world.stage;
  const car = world.b05.root;
  car.updateMatrixWorld();
  camera.position.copy(DRIVER_EYE).applyMatrix4(car.matrixWorld);
  lookPoint
    .set(-10 * Math.cos(lookYaw), DRIVER_EYE.y - 0.6 + lookPitch * 10, DRIVER_EYE.z + 10 * Math.sin(lookYaw))
    .applyMatrix4(car.matrixWorld);
  camera.lookAt(lookPoint);
}

export function aim(world: World, position: Vector3, target: Vector3): void {
  world.stage.camera.position.copy(position);
  world.stage.camera.lookAt(target);
}

function setView(world: World, view: View): void {
  world.b05.root.visible = view !== 'driver';
  world.cockpit.root.visible = view === 'driver';
  world.hands.root.visible = view === 'walker';
}

/** One camera set-up of a beat. Shots are listed in order; each lasts until `until` (beat seconds). */
export interface Shot {
  until: number;
  view: View;
  /** Field of view, fixed or animated (zooms). */
  fov: number | ((elapsed: number) => number);
  frame: (elapsed: number) => void;
}

/** Director: picks the current shot every frame. Add it last to a beat so its camera wins. */
export function direct(timeline: Timeline, world: World, shots: readonly Shot[]): void {
  const { camera } = world.stage;
  const lastShot = shots[shots.length - 1];
  timeline.tween(0, lastShot.until, (_progress, elapsed) => {
    const shot = shots.find((candidate) => elapsed < candidate.until) ?? lastShot;
    setView(world, shot.view);
    shot.frame(elapsed);
    const fov = typeof shot.fov === 'number' ? shot.fov : shot.fov(elapsed);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, ease.linear);
}

/** A look target the camera should face by `time` (beat seconds). */
export interface LookKey {
  time: number;
  target: Vector3;
}

/** Where the camera looks at `elapsed`: eased pans between the keys, holding before the first and after the last. */
export function lookAlong(keys: readonly LookKey[], elapsed: number, out: Vector3): Vector3 {
  const nextIndex = keys.findIndex((key) => key.time > elapsed);
  if (nextIndex === -1) {
    return out.copy(keys[keys.length - 1].target);
  }
  if (nextIndex === 0) {
    return out.copy(keys[0].target);
  }
  const from = keys[nextIndex - 1];
  const to = keys[nextIndex];
  return out.lerpVectors(from.target, to.target, ease.inOut((elapsed - from.time) / (to.time - from.time)));
}

/** A point 3 m ahead of where the camera currently looks — the start of the next pan. */
export function currentLookTarget(world: World): Vector3 {
  const { camera } = world.stage;
  return camera.getWorldDirection(new Vector3()).multiplyScalar(3).add(camera.getWorldPosition(new Vector3()));
}

const TRAIN_PERIOD_SECONDS = 28;
const TRAIN_CROSSING_SECONDS = 9;
const CYCLIST_PERIOD_SECONDS = 45;
const CYCLIST_RIDE_SECONDS = 32;
const CYCLIST_FROM_X = 74;
const CYCLIST_TO_X = -50;
const CYCLIST_BELL_RANGE = 20;
const CYCLIST_BELL_INTERVAL_SECONDS = 3.5;

/**
 * Everything that just keeps living for the whole film: clouds, sparkles, the cat, trains on the
 * bridge, a jogger and a dog by the Migros. Also drags the sun's shadow box along with the camera.
 */
export function buildAmbience(world: World): Timeline {
  const { scene, camera } = world.stage;
  const { city, home, b05, cockpit } = world;
  const timeline = new Timeline();

  const trains = [
    createTrain({ body: 0xffffff, stripe: 0x2f5fa5, doors: 0xd52b1e, label: 'S12', cars: 2 }),
    createTrain({ body: 0xf2f0ec, stripe: 0xd52b1e, doors: 0xd52b1e, label: 'InterCity', cars: 3 }),
  ];
  trains.forEach((train, index) => {
    train.position.set(RAILWAY.trackX[index], RAILWAY.deckY, -400);
    train.rotation.y = index === 0 ? 0 : Math.PI;
    scene.add(train);
  });

  const jogger = createPasserby({
    shirt: 0x39c0e0,
    trousers: 0x222228,
    hair: 0xc98a3a,
    hairStyle: 'ponytail',
    headband: 0xff4f8a,
    shoes: 0xff6a2a,
  });
  jogger.root.rotation.y = Math.PI / 2;
  const dogOwner = createPasserby({ shirt: 0x4fa36a, trousers: 0x6b5a3b, hair: 0x8a8a8a, hairStyle: 'bald', beard: true });
  dogOwner.root.position.set(14.8, 0, -8.6);
  dogOwner.root.rotation.y = 0.4;
  const dog = createDog();
  dog.root.position.set(15.6, 0, -7.8);
  dog.root.rotation.y = 1.1;
  // The annoying cyclist: slaloms down the middle of the far lane, never stops ringing.
  const cyclist = createCyclist(0xff4f8a, {
    shirt: 0xc6f03a,
    trousers: 0x222228,
    hair: 0x4a2f1b,
    hairStyle: 'short',
    glasses: true,
    backpack: 0xff8a1e,
  });
  let lastBellTime = Number.NEGATIVE_INFINITY;
  [jogger.root, dogOwner.root, dog.root, cyclist.root].forEach((root) => {
    setOutlineThickness(root, OUTLINE.character);
    scene.add(root);
  });

  const cameraWorld = new Vector3();
  const cloudStartX = city.clouds.map((cloud) => cloud.position.x);
  // Birdsong is scheduled up front, so keep it to a generous film length rather than the full loop.
  timeline.at(0, () => world.sounds.cityAmbience(AMBIENCE_SOUND_SECONDS));
  timeline.tween(0, LOOP_SECONDS, (_progress, elapsed) => {
    camera.getWorldPosition(cameraWorld);
    followWithSun(city, cameraWorld);

    city.clouds.forEach((cloud, index) => {
      cloud.position.x = cloudStartX[index] + elapsed * 0.25 * (index + 1);
    });
    b05.sparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin(elapsed * 2.3 + index * 1.9)) ** 8 * 0.45);
    });
    city.catTail.rotation.z = Math.sin(elapsed * 1.8) * 0.5;
    dog.tail.rotation.y = Math.sin(elapsed * 18) * 0.6;
    dogOwner.head.rotation.y = Math.sin(elapsed * 0.7) * 0.4;

    // Jogger laps the far sidewalk every 30 s.
    const lap = (elapsed % 30) / 30;
    const joggerX = lerp(-40, 70, lap);
    jogger.root.position.set(joggerX, Math.abs(Math.sin(joggerX * 2.2)) * 0.06, -8);
    walkCycle(jogger, joggerX * 2.2, 0.9);

    // Cyclist: one westbound ride every CYCLIST_PERIOD_SECONDS, out from under the railway bridge.
    const rideSeconds = elapsed % CYCLIST_PERIOD_SECONDS;
    const isRiding = rideSeconds < CYCLIST_RIDE_SECONDS;
    cyclist.root.visible = isRiding;
    if (isRiding) {
      const cyclistX = lerp(CYCLIST_FROM_X, CYCLIST_TO_X, rideSeconds / CYCLIST_RIDE_SECONDS);
      const weave = Math.sin(rideSeconds * 1.6);
      cyclist.root.position.set(cyclistX, 0, CITY.farOuterLaneZ + weave * 0.6);
      cyclist.root.rotation.set(weave * 0.12, Math.cos(rideSeconds * 1.6) * 0.3, 0, 'YXZ');
      pedal(cyclist, rideSeconds * 6);
      const isNearCamera = cyclist.root.position.distanceTo(cameraWorld) < CYCLIST_BELL_RANGE;
      if (isNearCamera && elapsed - lastBellTime > CYCLIST_BELL_INTERVAL_SECONDS) {
        lastBellTime = elapsed;
        world.sounds.bikeBell();
        world.callouts.show('DRING DRING!', cyclist.rider.head, 1.2, 0.4);
      }
    }

    const trainCycle = Math.floor(elapsed / TRAIN_PERIOD_SECONDS);
    const trainProgress = Math.min(1, (elapsed % TRAIN_PERIOD_SECONDS) / TRAIN_CROSSING_SECONDS);
    trains.forEach((train, index) => {
      const isRunning = trainCycle % 2 === index;
      const [fromZ, toZ] = index === 0 ? [-60, 140] : [80, -140];
      train.position.z = isRunning ? lerp(fromZ, toZ, trainProgress) : -400;
    });

    // In the flat: second hand ticks, the key twinkles.
    home.clockHand.rotation.z = -Math.floor(elapsed) * ((Math.PI * 2) / 60);
    home.keySparkle.scale.setScalar(Math.max(0, Math.sin(elapsed * 1.7)) ** 12 * 0.12);
    home.flag.rotation.x = Math.sin(elapsed * 0.6) * 0.02;

    cockpit.freshener.rotation.z = Math.sin(elapsed * 2.1) * 0.12;
    cockpit.freshener.rotation.x = Math.sin(elapsed * 1.3) * 0.08;
  }, ease.linear);
  return timeline;
}
