import { MathUtils, Vector3, type Object3D } from 'three';
import { createB05, createSparkle, setIndicators } from '../assets/b05';
import { CITY, createCity, LAMP_POST_X } from '../assets/city';
import { createDog, createKid, createPasserby, createPovHands, walkCycle, type Passerby } from '../assets/people';
import { createTunedCar } from '../assets/tunedCar';
import { box, toon } from '../engine/build';
import { HIPHOP_BPM, type SoundBoard } from '../engine/audio';
import type { Callouts } from '../engine/callouts';
import type { Stage } from '../engine/stage';
import { ease, lerp, Timeline } from '../engine/timeline';

export const SCENE01_DURATION_SECONDS = 17;

const EYE_HEIGHT = 1.68;
const STEP_LENGTH = 0.75;
const BEAT_RATE = (HIPHOP_BPM / 60) * Math.PI;
const B05_POSITION = new Vector3(3, 0, CITY.parkingZ);
const B05_LOOK_POINT = new Vector3(2.4, 0.9, CITY.parkingZ);
const TUNED_CAR_STOP_X = 1.8;
const TUNED_CAR_START_X = 55;
const GAWKER_START_X = 3.5;
const GAWKER_BONK_X = LAMP_POST_X + 0.28;
const GAWKER_BONK_TIME = 5;

/**
 * Scene 1 — "Die Herausforderung".
 * Alain walks (POV) towards his sparkling B05, passers-by gawk, then a tuned car
 * rolls in with a toddler at the wheel who whistles at him.
 */
export function buildScene01(stage: Stage, sounds: SoundBoard, callouts: Callouts): Timeline {
  const { scene, camera } = stage;
  const timeline = new Timeline();
  const city = createCity(scene);

  const b05 = createB05(0x2f7fe0);
  b05.root.position.copy(B05_POSITION);
  scene.add(b05.root);

  const hands = createPovHands();
  camera.add(hands.root);

  const gawker = createPasserby(0xffc23d, 0x4a2f1b, 0x3b4a6b);
  gawker.root.position.set(GAWKER_START_X, 0, CITY.curbZ + 0.8);
  gawker.root.rotation.y = -Math.PI / 2;
  scene.add(gawker.root);

  const photographer = createPasserby(0xff7fa8, 0x1c1c1c, 0x5b3a6b);
  photographer.root.position.set(6.6, 0, 4.7);
  photographer.root.rotation.y = Math.PI + 0.3;
  photographer.arms.forEach((arm) => arm.rotation.set(-1.45, 0, 0));
  const phone = box(0.08, 0.14, 0.02, toon(0x222228));
  phone.position.set(0, -0.68, 0.05);
  photographer.arms[1].add(phone);
  const phoneFlash = createSparkle();
  phoneFlash.position.set(0, -0.68, 0.12);
  photographer.arms[1].add(phoneFlash);
  scene.add(photographer.root);

  const dogOwner = createPasserby(0x4fa36a, 0xb0b0b0, 0x6b5a3b);
  dogOwner.root.position.set(4.8, 0, -5.6);
  scene.add(dogOwner.root);
  const dog = createDog();
  dog.root.position.set(3.7, 0, -5);
  dog.root.rotation.y = -0.08;
  dog.body.rotation.x = -0.3;
  scene.add(dog.root);

  const tunedCar = createTunedCar();
  tunedCar.root.position.set(TUNED_CAR_START_X, 0, CITY.farLaneZ);
  scene.add(tunedCar.root);
  const kid = createKid();
  tunedCar.driverSeat.add(kid.root);

  const lookTarget = new Vector3();
  const kidHeadPosition = new Vector3();
  let lookBlend = 0;
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

  // Big showroom "ping" off the roof the moment the sun catches it.
  timeline.at(2, () => sounds.ping(2400));
  timeline.tween(2, 0.6, (progress) => {
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

  // ── Photographer snaps two pictures ─────────────────────────────────────────
  for (const flashTime of [2.8, 3.5]) {
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
  timeline.tween(5.5, 0.45, (progress) => {
    hands.keyHand.position.set(0.3 - progress * 0.06, -0.34 + progress * 0.12, -0.62);
  }, ease.out);
  timeline.at(6, () => {
    sounds.unlockBeep();
    hands.fobLed.emissive.set(0xff2020);
    callouts.show('BIP BIP!', b05.root, 1.2, 1.9);
  });
  timeline.tween(6, 0.8, (progress) => {
    setIndicators(b05, progress < 0.25 || (progress > 0.45 && progress < 0.7));
  }, ease.linear);
  timeline.at(6.3, () => hands.fobLed.emissive.set(0x000000));
  timeline.tween(6.6, 0.5, (progress) => {
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
      wheel.rotation.y += rolled / 0.34;
    });
  }, ease.out);
  timeline.tween(6.2, SCENE01_DURATION_SECONDS - 6.2, (_progress, elapsed) => {
    const distance = Math.abs(tunedCar.root.position.x - camera.position.x);
    setMusicVolume?.(MathUtils.clamp(1 - distance / 50, 0, 1) ** 2 * 0.9);
    const thump = Math.abs(Math.sin(elapsed * BEAT_RATE));
    tunedCar.body.position.y = thump * 0.035;
    tunedCar.hoodPacifier.position.y = 0.82 + thump * 0.12;
    tunedCar.hoodPacifier.rotation.z = Math.sin(elapsed * BEAT_RATE) * 0.3;
    kid.head.rotation.x = Math.sin(elapsed * BEAT_RATE * 2) * 0.08;
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
    camera.fov = lerp(60, 40, progress);
    camera.updateProjectionMatrix();
  });
  timeline.tween(11.4, 0.6, (progress) => {
    dog.root.rotation.y = lerp(-0.08, 1.2, progress);
    photographer.head.rotation.y = lerp(0, -0.9, progress);
  });

  // ── The challenge: wave, whistle, glint, nod ────────────────────────────────
  timeline.tween(12, 3.6, (progress, elapsed) => {
    kid.wavingArm.rotation.z = Math.sin(elapsed * 10) * 0.5 * Math.sin(progress * Math.PI);
  }, ease.linear);
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
