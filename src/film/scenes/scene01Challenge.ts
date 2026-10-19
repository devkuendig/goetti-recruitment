import { MathUtils, Vector3, type Object3D } from 'three';
import { createB05, createSparkle, setIndicators } from '../assets/b05';
import { CITY, createCity, LAMP_POST_X, MIGROS, RAILWAY } from '../assets/city';
import {
  createDog,
  createKid,
  createPasserby,
  createPovHands,
  createSchoolkid,
  KID_PACIFIER_IN_MOUTH,
  walkCycle,
  type Passerby,
  type PasserbyLook,
} from '../assets/people';
import { createBus, createPigeon, createTrain, furnishStreet, type TrainLivery } from '../assets/streetFurniture';
import { createTunedCar } from '../assets/tunedCar';
import { box, setOutlineThickness, toon } from '../engine/build';
import { HIPHOP_BPM, type SoundBoard } from '../engine/audio';
import type { Callouts } from '../engine/callouts';
import type { Stage } from '../engine/stage';
import { ease, lerp, Timeline } from '../engine/timeline';

export const SCENE01_DURATION_SECONDS = 17;

const EYE_HEIGHT = 1.68;
const STEP_LENGTH = 0.75;
const POV_FOV = 60;
const BEAT_RATE = (HIPHOP_BPM / 60) * Math.PI;
const B05_POSITION = new Vector3(3, 0, CITY.parkingZ);
const B05_LOOK_POINT = new Vector3(2.4, 0.9, CITY.parkingZ);
const TUNED_CAR_STOP_X = 1.8;
const TUNED_CAR_START_X = 55;
const GAWKER_START_X = 0.6;
const GAWKER_BONK_X = LAMP_POST_X + 0.28;
const GAWKER_BONK_TIME = 5;
/** Two seconds before the bonk, so the two gags don't step on each other. */
const UNLOCK_TIME = GAWKER_BONK_TIME - 2;

const OUTLINE = { background: 0.0022, character: 0.005 } as const;

/** School group 1, on the sidewalk behind the B05, facing it. */
const ADMIRERS: { look: PasserbyLook; x: number; z: number; yaw: number }[] = [
  { look: { shirt: 0xe2453b, trousers: 0x3b4a6b, hair: 0x4a2f1b, hairStyle: 'short', backpack: 0x2f7f5f }, x: 1.6, z: 7.5, yaw: Math.PI },
  { look: { shirt: 0x39c0e0, trousers: 0x222228, hair: 0xc98a3a, hairStyle: 'ponytail', backpack: 0xf2a33a }, x: 2.7, z: 7.7, yaw: Math.PI },
  { look: { shirt: 0xf3e3a1, trousers: 0x6b5a3b, hair: 0x1c1c1c, hairStyle: 'short', skin: 0xb07a50, backpack: 0xe2453b }, x: 5.0, z: 7.6, yaw: Math.PI - 0.2 },
  { look: { shirt: 0x6cc070, trousers: 0x3b4a6b, hair: 0x8a5a2c, hairStyle: 'bun', backpack: 0x5b3a6b }, x: 6.4, z: 7.3, yaw: -2.58 },
];

/** School group 2, heading into the Migros. */
const SHOPPER_LOOKS: PasserbyLook[] = [
  { shirt: 0xffc23d, trousers: 0x222228, hair: 0x1c1c1c, hairStyle: 'short', backpack: 0xe2453b },
  { shirt: 0xff7fa8, trousers: 0x3b4a6b, hair: 0xc98a3a, hairStyle: 'ponytail', backpack: 0x39c0e0 },
  { shirt: 0x2f5fa5, trousers: 0x5a5a62, hair: 0x4a2f1b, hairStyle: 'short', skin: 0x8a5a3c, backpack: 0xffc23d },
  { shirt: 0xb5d3f0, trousers: 0x6b5a3b, hair: 0x1c1c1c, hairStyle: 'bun', backpack: 0x6cc070 },
  { shirt: 0xf2a33a, trousers: 0x222228, hair: 0x8a5a2c, hairStyle: 'short', glasses: true, backpack: 0x2f5fa5 },
];
const SHOPPER_LEADER_START_X = 10;
const SHOPPER_SPACING = 1;
const SHOPPER_SPEED = 1.3;
const SHOPPER_PATH_Z = -9.4;

/**
 * Train runs over the bridge. `fromZ`/`toZ` are the nose positions; each train is only visible
 * while it crosses the ~17 m gap between the building rows at the end of the street.
 * S-Bahn: 20 m/s, in view ≈ 2–5.4 s. InterCity: 25 m/s, in view ≈ 6.5–10 s.
 */
const TRAIN_RUNS: { livery: TrainLivery; track: 0 | 1; fromZ: number; toZ: number; start: number; duration: number }[] = [
  {
    livery: { body: 0xffffff, stripe: 0x2f5fa5, doors: 0xd52b1e, label: 'S12', cars: 2 },
    track: 0,
    fromZ: -50,
    toZ: 130,
    start: 0,
    duration: 9,
  },
  {
    livery: { body: 0xf2f0ec, stripe: 0xd52b1e, doors: 0xd52b1e, label: 'InterCity', cars: 3 },
    track: 1,
    fromZ: 71,
    toZ: -129,
    start: 4,
    duration: 8,
  },
];

/** A fixed camera set-up that cuts away from Alain's POV for a while. */
interface Shot {
  start: number;
  end: number;
  position: Vector3;
  target: () => Vector3;
  fov: number;
}

/**
 * Scene 1 — Zürcherstrasse 7, Winterthur.
 * Alain walks (POV) on the right sidewalk towards the station and his sparkling B05.
 * A school group admires the B05, another one heads into the Migros opposite. Then a tuned car
 * rolls in with a toddler at the wheel who whistles at him. The bonk plays in Alain's POV.
 * Two cut-aways: a commercial-style hero shot of the B05 and a reverse shot on the kid.
 */
export function buildScene01(stage: Stage, sounds: SoundBoard, callouts: Callouts): Timeline {
  const { scene, camera } = stage;
  const timeline = new Timeline();
  const city = createCity(scene);
  const street = furnishStreet();
  city.root.add(street);
  setOutlineThickness(city.root, OUTLINE.background);

  const b05 = createB05(0x2f7fe0);
  b05.root.position.copy(B05_POSITION);
  scene.add(b05.root);

  const hands = createPovHands();
  camera.add(hands.root);

  const gawker = createPasserby({
    shirt: 0xffc23d,
    trousers: 0x3b4a6b,
    hair: 0x4a2f1b,
    hairStyle: 'short',
    bag: 0x8a5a2c,
  });
  gawker.root.position.set(GAWKER_START_X, 0, CITY.curbZ + 0.8);
  gawker.root.rotation.y = -Math.PI / 2;

  // School group 1 admires the B05 from the sidewalk; the photographer is one of them.
  const photographer = createSchoolkid({
    shirt: 0xff7fa8,
    trousers: 0x5b3a6b,
    hair: 0x1c1c1c,
    hairStyle: 'bun',
    glasses: true,
    shoes: 0xffffff,
    backpack: 0x3a6ea5,
  });
  photographer.root.position.set(3.8, 0, 7.5);
  photographer.root.rotation.y = Math.PI + 0.3;
  photographer.arms.forEach((arm) => arm.rotation.set(-1.45, 0, 0));
  const phone = box(0.08, 0.14, 0.02, toon(0x222228));
  phone.position.set(0, -0.68, 0.05);
  photographer.arms[1].add(phone);
  const phoneFlash = createSparkle();
  phoneFlash.position.set(0, -0.68, 0.12);
  photographer.arms[1].add(phoneFlash);

  const dogOwner = createPasserby({
    shirt: 0x4fa36a,
    trousers: 0x6b5a3b,
    hair: 0x8a8a8a,
    hairStyle: 'bald',
    beard: true,
  });
  dogOwner.root.position.set(4.8, 0, -8.6);
  const dog = createDog();
  dog.root.position.set(3.7, 0, -8);
  dog.root.rotation.y = -0.08;
  dog.body.rotation.x = -0.3;

  const jogger = createPasserby({
    shirt: 0x39c0e0,
    trousers: 0x222228,
    hair: 0xc98a3a,
    hairStyle: 'ponytail',
    headband: 0xff4f8a,
    shoes: 0xff6a2a,
  });
  jogger.root.position.set(-20, 0, -8);
  jogger.root.rotation.y = Math.PI / 2;

  const pensioner = createPasserby({
    shirt: 0x9a7a5a,
    trousers: 0x5a5a62,
    hair: 0xdddddd,
    hairStyle: 'hat',
    glasses: true,
  });
  pensioner.root.position.set(16, 0, -7.7);
  pensioner.root.rotation.y = -Math.PI / 2;

  const admirers = ADMIRERS.map(({ look, x, z, yaw }) => {
    const admirer = createSchoolkid(look);
    admirer.root.position.set(x, 0, z);
    admirer.root.rotation.y = yaw;
    admirer.mouth.scale.set(1, 1.1, 0.5);
    return admirer;
  });
  const [pointer, hopper] = admirers;
  pointer.arms[1].rotation.x = -1.5;

  // School group 2 walks along the far sidewalk and into the Migros.
  const shoppers = SHOPPER_LOOKS.map((look, index) => {
    const shopper = createSchoolkid(look);
    shopper.root.position.set(SHOPPER_LEADER_START_X - index * SHOPPER_SPACING, 0, SHOPPER_PATH_Z);
    shopper.root.rotation.y = Math.PI / 2;
    return shopper;
  });

  const characters = [gawker, photographer, dogOwner, jogger, pensioner, ...admirers, ...shoppers];
  characters.forEach((person) => scene.add(person.root));
  scene.add(dog.root);

  const tunedCar = createTunedCar();
  tunedCar.root.position.set(TUNED_CAR_START_X, 0, CITY.farLaneZ);
  scene.add(tunedCar.root);
  const kid = createKid();
  tunedCar.driverSeat.add(kid.root);

  const bus = createBus();
  bus.root.position.x = 45;
  scene.add(bus.root);

  // Two trains cross the railway bridge at the end of the street, in opposite directions.
  const trains = TRAIN_RUNS.map((run) => {
    const train = createTrain(run.livery);
    train.position.set(RAILWAY.trackX[run.track], RAILWAY.deckY, run.fromZ);
    train.rotation.y = run.fromZ < run.toZ ? 0 : Math.PI;
    scene.add(train);
    return train;
  });

  const pigeon = createPigeon();
  pigeon.root.position.set(4.5, 0, -1.3);
  pigeon.root.rotation.y = 2.2;
  scene.add(pigeon.root);

  [...characters.map((person) => person.root), dog.root, kid.root, pigeon.root].forEach((root) =>
    setOutlineThickness(root, OUTLINE.character),
  );

  const lookTarget = new Vector3();
  const kidHeadPosition = new Vector3();
  let lookBlend = 0;
  let povFov = POV_FOV;
  let setMusicVolume: ((volume: number) => void) | undefined;

  // ── Ambience, clouds, idle loops ────────────────────────────────────────────
  timeline.at(0, () => sounds.cityAmbience(SCENE01_DURATION_SECONDS + 2));
  const cloudStartX = city.clouds.map((cloud) => cloud.position.x);
  timeline.tween(0, SCENE01_DURATION_SECONDS, (_progress, elapsed) => {
    city.clouds.forEach((cloud, index) => {
      cloud.position.x = cloudStartX[index] + elapsed * 0.25 * (index + 1);
    });
    b05.sparkles.forEach((sparkle, index) => {
      const twinkle = Math.max(0, Math.sin(elapsed * 2.3 + index * 1.9)) ** 8;
      sparkle.scale.setScalar(twinkle * 0.45);
    });
    dog.tail.rotation.y = Math.sin(elapsed * 18) * 0.6;
    dogOwner.head.rotation.y = 0.5 + Math.sin(elapsed * 0.7) * 0.1;
    city.catTail.rotation.z = Math.sin(elapsed * 1.8) * 0.5;
  }, ease.linear);

  // ── Background life: jogger, pensioner, bus ─────────────────────────────────
  timeline.tween(0, 12, (progress) => {
    const x = lerp(-20, 25, progress);
    jogger.root.position.x = x;
    jogger.root.position.y = Math.abs(Math.sin((x + 20) * 2.2)) * 0.06;
    walkCycle(jogger, (x + 20) * 2.2, 0.9);
  }, ease.linear);
  timeline.tween(0, 14, (progress) => {
    const x = lerp(16, 7, progress);
    pensioner.root.position.x = x;
    walkCycle(pensioner, (16 - x) * 5, 0.3);
  }, ease.linear);
  // He stops and shakes his head at the tuned car.
  timeline.tween(10.5, 3, (_progress, elapsed) => {
    pensioner.head.rotation.y = -0.9 + Math.sin(elapsed * 9) * 0.25;
  }, ease.linear);
  TRAIN_RUNS.forEach((run, index) => {
    timeline.tween(run.start, run.duration, (progress) => {
      trains[index].position.z = lerp(run.fromZ, run.toZ, progress);
    }, ease.linear);
  });
  let previousBusX = 45;
  timeline.tween(0.3, 6, (progress) => {
    const x = lerp(45, -60, progress);
    const rolled = previousBusX - x;
    previousBusX = x;
    bus.root.position.x = x;
    bus.wheels.forEach((wheel) => {
      wheel.rotation.z += rolled / 0.5;
    });
  }, ease.linear);

  // ── POV walk towards the B05 ────────────────────────────────────────────────
  let previousStepIndex = 0;
  timeline.tween(0, 10.5, (progress) => {
    const x = lerp(-16, -2.6, progress);
    const walkedDistance = x + 16;
    const stepPhase = (walkedDistance / STEP_LENGTH) * Math.PI;
    const stepIndex = Math.floor(stepPhase / Math.PI);
    if (stepIndex !== previousStepIndex) {
      previousStepIndex = stepIndex;
      sounds.footstep();
    }
    const bob = Math.abs(Math.sin(stepPhase)) * 0.045 * (1 - progress ** 6);
    camera.position.set(x, EYE_HEIGHT + bob, CITY.sidewalkZ);
    hands.root.position.y = -bob * 0.6;
    hands.root.rotation.z = Math.sin(stepPhase) * 0.03;
  }, ease.linear);

  // Big showroom "ping" off the roof the moment the sun catches it — with a commercial banner.
  timeline.at(1, () => {
    sounds.ping(2400);
    callouts.showBanner('Leapmotor B05', 'äusserst angesagt', 2.6);
  });
  timeline.tween(1, 0.6, (progress) => {
    b05.sparkles[1].scale.setScalar(Math.sin(progress * Math.PI) * 1.4);
  }, ease.linear);

  // ── Gawker walks past, stares, walks into the lamp post ─────────────────────
  timeline.tween(0.3, GAWKER_BONK_TIME - 0.3, (progress) => {
    const x = lerp(GAWKER_START_X, GAWKER_BONK_X, progress);
    gawker.root.position.x = x;
    walkCycle(gawker, (GAWKER_START_X - x) * 4);
    turnHeadTowards(gawker, B05_LOOK_POINT, 1.9);
  }, ease.linear);
  timeline.tween(2.5, 0.4, (progress) => {
    gawker.mouth.scale.set(1, lerp(0.25, 1.1, progress), 0.5);
  });
  timeline.at(GAWKER_BONK_TIME, () => {
    sounds.bonk();
    callouts.show('BONK!', gawker.head, 1.4, 0.5);
    gawker.dizzyStars.visible = true;
  });
  timeline.tween(GAWKER_BONK_TIME, 0.5, (progress) => {
    gawker.root.position.x = lerp(GAWKER_BONK_X, GAWKER_BONK_X + 0.47, progress);
    gawker.root.rotation.z = Math.sin(progress * Math.PI) * 0.25;
    walkCycle(gawker, 0, 0);
    gawker.head.rotation.y = lerp(gawker.head.rotation.y, 0, progress);
  }, ease.out);
  timeline.tween(GAWKER_BONK_TIME, SCENE01_DURATION_SECONDS - GAWKER_BONK_TIME, (_progress, elapsed) => {
    city.lampPost.rotation.x = Math.sin(elapsed * 25) * 0.05 * Math.exp(-elapsed * 2);
    gawker.dizzyStars.rotation.y = elapsed * 6;
    gawker.root.rotation.x = Math.sin(elapsed * 3) * 0.06;
  }, ease.linear);

  // ── School group 1: staring, pointing, one hops with excitement ─────────────
  let admirerLookBlend = 0;
  const admirerLookTarget = new Vector3();
  timeline.tween(0, SCENE01_DURATION_SECONDS, (_progress, elapsed) => {
    admirerLookTarget.lerpVectors(B05_LOOK_POINT, kidHeadPosition, admirerLookBlend);
    admirers.forEach((admirer) => turnHeadTowards(admirer, admirerLookTarget, 1.2));
    hopper.root.position.y = elapsed < 10 ? Math.abs(Math.sin(elapsed * 6)) * 0.12 : 0;
    pointer.arms[1].rotation.z = Math.sin(elapsed * 4) * 0.08;
  }, ease.linear);
  timeline.tween(11.4, 0.6, (progress) => {
    admirerLookBlend = progress;
  });

  // ── School group 2: in single file to the Migros, through the sliding doors ─
  let doorOpening = 0;
  let previousShopperElapsed = 0;
  timeline.tween(0, SCENE01_DURATION_SECONDS, (_progress, elapsed) => {
    const frameSeconds = Math.max(0, elapsed - previousShopperElapsed);
    previousShopperElapsed = elapsed;
    let someoneAtDoor = false;
    shoppers.forEach((shopper, index) => {
      const startX = SHOPPER_LEADER_START_X - index * SHOPPER_SPACING;
      const sidewalkLength = MIGROS.doorX - startX;
      const walked = elapsed * SHOPPER_SPEED;
      if (walked < sidewalkLength) {
        shopper.root.position.set(startX + walked, 0, SHOPPER_PATH_Z);
        shopper.root.rotation.y = Math.PI / 2;
      } else {
        shopper.root.position.set(MIGROS.doorX, 0, SHOPPER_PATH_Z - (walked - sidewalkLength));
        shopper.root.rotation.y = Math.PI;
      }
      shopper.root.visible = shopper.root.position.z > MIGROS.facadeZ - 0.1;
      walkCycle(shopper, walked * 5, shopper.root.visible ? 0.5 : 0);
      if (shopper.root.visible && Math.abs(shopper.root.position.x - MIGROS.doorX) < 2.5) {
        someoneAtDoor = true;
      }
    });
    // Doors open in ~0.4 s and close in ~0.8 s.
    doorOpening = MathUtils.clamp(doorOpening + (someoneAtDoor ? 2.5 : -1.25) * frameSeconds, 0, 1);
    const [leftDoor, rightDoor] = city.migrosDoors;
    leftDoor.position.x = MIGROS.doorX - 0.6 - doorOpening * 1.1;
    rightDoor.position.x = MIGROS.doorX + 0.6 + doorOpening * 1.1;
  }, ease.linear);

  // ── Photographer snaps two pictures ─────────────────────────────────────────
  for (const flashTime of [1.6, 2.2]) {
    timeline.at(flashTime, () => sounds.cameraShutter());
    timeline.tween(flashTime, 0.25, (progress) => {
      phoneFlash.scale.setScalar(Math.sin(progress * Math.PI) * 0.6);
    }, ease.linear);
  }
  timeline.tween(4.5, 0.8, (progress) => {
    photographer.arms.forEach((arm) => {
      arm.rotation.x = lerp(-1.45, -0.3, progress);
    });
  });

  // ── Unlock with the key fob ─────────────────────────────────────────────────
  timeline.tween(UNLOCK_TIME - 0.5, 0.45, (progress) => {
    hands.keyHand.position.set(0.3 - progress * 0.06, -0.34 + progress * 0.12, -0.62);
  }, ease.out);
  timeline.at(UNLOCK_TIME, () => {
    sounds.unlockBeep();
    hands.fobLed.emissive.set(0xff2020);
    callouts.show('BIP BIP!', b05.root, 1.2, 1.9);
  });
  timeline.tween(UNLOCK_TIME, 0.8, (progress) => {
    setIndicators(b05, progress < 0.25 || (progress > 0.45 && progress < 0.7));
  }, ease.linear);
  timeline.at(UNLOCK_TIME + 0.3, () => hands.fobLed.emissive.set(0x000000));
  timeline.tween(UNLOCK_TIME + 0.6, 0.5, (progress) => {
    hands.keyHand.position.set(0.24 + progress * 0.06, -0.22 - progress * 0.12, -0.62);
  });

  // ── Tuned car rolls in, bass first ──────────────────────────────────────────
  timeline.at(6.2, () => {
    setMusicVolume = sounds.hipHopMusic(SCENE01_DURATION_SECONDS);
  });
  let previousCarX = TUNED_CAR_START_X;
  timeline.tween(6.5, 4.3, (progress) => {
    const x = lerp(TUNED_CAR_START_X, TUNED_CAR_STOP_X, progress);
    const rolled = previousCarX - x;
    previousCarX = x;
    tunedCar.root.position.x = x;
    tunedCar.wheels.forEach((wheel) => {
      wheel.rotation.z += rolled / 0.34;
    });
  }, ease.out);
  timeline.tween(6.2, SCENE01_DURATION_SECONDS - 6.2, (_progress, elapsed) => {
    const distance = Math.abs(tunedCar.root.position.x - camera.position.x);
    setMusicVolume?.(MathUtils.clamp(1 - distance / 50, 0, 1) ** 2 * 0.9);
    const thump = Math.abs(Math.sin(elapsed * BEAT_RATE));
    tunedCar.body.position.y = thump * 0.035;
    tunedCar.hoodPacifier.position.y = 0.82 + thump * 0.12;
    tunedCar.hoodPacifier.rotation.z = Math.sin(elapsed * BEAT_RATE) * 0.3;
    tunedCar.fuzzyDice.rotation.x = Math.sin(elapsed * BEAT_RATE) * 0.35;
    kid.head.rotation.x = Math.sin(elapsed * BEAT_RATE * 2) * 0.08;
  }, ease.linear);

  // ── Pigeon pecks on the road until the bass scares it off ───────────────────
  timeline.tween(0, 8.8, (_progress, elapsed) => {
    pigeon.head.rotation.x = Math.max(0, Math.sin(elapsed * 7)) * 0.9;
  }, ease.linear);
  timeline.at(8.8, () => callouts.show('GURRR!', pigeon.root, 0.9, 0.4));
  timeline.tween(8.8, 2.5, (progress, elapsed) => {
    pigeon.root.position.set(lerp(4.5, 1, progress), progress ** 0.7 * 7, lerp(-1.3, 9, progress));
    pigeon.root.rotation.y = -0.5;
    pigeon.head.rotation.x = 0;
    const flap = Math.sin(elapsed * 28) * 0.9;
    pigeon.wings[0].rotation.z = flap;
    pigeon.wings[1].rotation.z = -flap;
  }, ease.linear);

  // ── Alain's double take: glance, back to the car, then snap to the kid ─────
  timeline.tween(0, SCENE01_DURATION_SECONDS, () => {
    kid.head.getWorldPosition(kidHeadPosition);
    lookTarget.lerpVectors(B05_LOOK_POINT, kidHeadPosition, lookBlend);
    camera.lookAt(lookTarget);
  }, ease.linear);
  timeline.tween(10.6, 0.35, (progress) => {
    lookBlend = progress * 0.85;
  });
  timeline.tween(11, 0.3, (progress) => {
    lookBlend = lerp(0.85, 0, progress);
  });
  timeline.tween(11.6, 0.5, (progress) => {
    lookBlend = progress;
  });
  timeline.tween(11.6, 1, (progress) => {
    povFov = lerp(POV_FOV, 24, progress);
  });
  timeline.tween(11.4, 0.6, (progress) => {
    dog.root.rotation.y = lerp(-0.08, 1.2, progress);
    photographer.head.rotation.y = lerp(0, -0.9, progress);
  });

  // ── The challenge: wave, whistle, glint, nod ────────────────────────────────
  timeline.tween(12, 3.6, (progress, elapsed) => {
    kid.wavingArm.rotation.z = Math.sin(elapsed * 10) * 0.5 * Math.sin(progress * Math.PI);
  }, ease.linear);
  // Pacifier pops out for the whistle, dangles at the chest, then goes back in.
  const pacifierDangling = new Vector3(0.02, -0.32, 0.2);
  timeline.at(12.2, () => callouts.show('PLOPP!', kid.head, 0.8, 0.45));
  timeline.tween(12.2, 0.3, (progress) => {
    kid.pacifier.position.lerpVectors(KID_PACIFIER_IN_MOUTH, pacifierDangling, progress);
    kid.pacifier.rotation.x = progress * 0.9;
  }, ease.out);
  timeline.tween(13.9, 0.3, (progress) => {
    kid.pacifier.position.lerpVectors(pacifierDangling, KID_PACIFIER_IN_MOUTH, progress);
    kid.pacifier.rotation.x = (1 - progress) * 0.9;
  }, ease.inOut);
  timeline.at(12.6, () => {
    sounds.wolfWhistle();
    callouts.show('FIU-FIUUUH!', kid.head, 1.6, 0.35);
  });
  timeline.tween(12.5, 1.3, (progress) => {
    const pucker = Math.sin(progress * Math.PI);
    kid.whistleMouth.scale.set(lerp(1.4, 0.7, pucker), lerp(0.4, 1, pucker), 0.6);
  }, ease.linear);
  const glint = createSparkle();
  kid.glintAnchor.add(glint);
  timeline.at(14.1, () => sounds.ping(3400));
  timeline.tween(14.1, 0.5, (progress) => {
    glint.scale.setScalar(Math.sin(progress * Math.PI) * 0.35);
  }, ease.linear);
  timeline.tween(15, 0.6, (progress) => {
    kid.root.rotation.x = Math.sin(progress * Math.PI * 2) * 0.12;
  }, ease.linear);

  // ── Director: cut-aways override the POV camera. Added last so it wins. ─────
  const shots: Shot[] = [
    {
      // Low commercial hero shot of the B05's nose, gawker and photographer behind.
      start: 0.8,
      end: 2.6,
      position: new Vector3(-1.6, 0.5, 4.9),
      target: () => new Vector3(2.5, 0.85, 5.5),
      fov: 42,
    },
    {
      // Reverse shot from the street onto the kid: pacifier plop, whistle, glint.
      start: 12.1,
      end: 14.7,
      position: new Vector3(0.4, 1.15, 1.2),
      target: () => kidHeadPosition,
      fov: 32,
    },
  ];
  timeline.tween(0, SCENE01_DURATION_SECONDS, (_progress, elapsed) => {
    const shot = shots.find((candidate) => elapsed >= candidate.start && elapsed < candidate.end);
    hands.root.visible = !shot;
    if (shot) {
      camera.position.copy(shot.position);
      camera.lookAt(shot.target());
    }
    const fov = shot ? shot.fov : povFov;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, ease.linear);

  return timeline;
}

const headWorld = new Vector3();

/** Turns a passer-by's head towards a point, but no owl tricks beyond `maxYaw`. */
function turnHeadTowards(person: Passerby, target: Vector3, maxYaw: number): void {
  const head: Object3D = person.head;
  head.getWorldPosition(headWorld);
  const worldYaw = Math.atan2(target.x - headWorld.x, target.z - headWorld.z);
  const localYaw = MathUtils.euclideanModulo(worldYaw - person.root.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
  head.rotation.y = MathUtils.clamp(localYaw, -maxYaw, maxYaw);
}
