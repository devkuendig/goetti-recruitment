import { Group, MathUtils, Vector3, type Mesh, type Sprite } from 'three';
import { createSparkle } from '../assets/b05';
import { createBanana } from '../assets/bananas';
import { createLabel } from '../assets/city';
import {
  createKid,
  createPasserby,
  createPram,
  createSchoolkid,
  turnHeadTowards,
  walkCycle,
  type Kid,
  type Passerby,
  type Pram,
} from '../assets/people';
import { box, cylinder, setOutlineThickness, sphere, toon } from '../engine/build';
import { cruiseProgress } from '../engine/route';
import type { ChoiceOption } from '../engine/story';
import { ease, lerp, Timeline } from '../engine/timeline';
import { aim, direct, driverCamera, EYE_HEIGHT, LANE_Z, OUTLINE, placeCar, POV_FOV, STOPS, type World } from './world';

const IDLE_SECONDS = 3600;
/** Everyone in the family walks towards -x, towards Alain. */
const FAMILY_YAW = -Math.PI / 2;
const PRAM_Z = 8.6;
const PRAM_START_X = 80;
const PRAM_STOP_X = 65.8;
const FAMILY_WALK_START = 2;
const FAMILY_WALK_SECONDS = 13.5;
const PRAM_WHEEL_RADIUS = 0.15;
const ALAIN_SPOT = new Vector3(63.4, EYE_HEIGHT, 7.4);
const CAR_LOOK = new Vector3(60, 1, LANE_Z);

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
}

/** Offsets from the pram, in world x/z (the family walks towards -x). */
const PAPA_OFFSET = { x: 1.15, z: PRAM_Z };
const MAMA_OFFSET = { x: 0.55, z: 9.6 };
const MOANA_OFFSET = { x: -0.5, z: 9.75 };
const MOANA_BITE_ARM = -2.4;
const MOANA_HOLD_ARM = -1.5;
const CONFETTI_COLORS = [0xff6fa5, 0xffd84a, 0x39c0e0, 0x6cc070, 0xff8a3a, 0xc98aff];

export function createFamilyCast(world: World): FamilyCast {
  const { scene } = world.stage;
  const papa = createPasserby({ shirt: 0x2f5fa5, trousers: 0x3b4a6b, hair: 0x1c1c1c, hairStyle: 'short', beard: true });
  const mama = createPasserby({ shirt: 0x39c0a0, trousers: 0x6b5a3b, hair: 0x8a5a2c, hairStyle: 'ponytail', bag: 0xffc23d });
  const moana = createSchoolkid({ shirt: 0xff7fa8, trousers: 0x5b3a6b, hair: 0x4a2f1b, hairStyle: 'ponytail', shoes: 0xffffff });
  const moanaBanana = createBanana();
  moanaBanana.position.set(0, -0.68, 0.08);
  moanaBanana.rotation.set(0, Math.PI / 2, Math.PI / 2);
  moana.arms[1].add(moanaBanana);
  moana.arms[1].rotation.x = MOANA_HOLD_ARM;

  const pram = createPram();
  const kid = createKid();
  pram.seat.add(kid.root);
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

  [papa.root, mama.root, moana.root, pram.root].forEach((root) => {
    setOutlineThickness(root, OUTLINE.character);
    scene.add(root);
  });
  scene.add(createWcSign());
  const cast = { papa, mama, moana, moanaBanana, pram, kid, eyeSparkles, tears, confetti };
  placeFamily(cast, PRAM_START_X, 0);
  return cast;
}

/** Public toilet sign just past where Alain parks — so close, and yet. */
function createWcSign(): Group {
  const sign = new Group();
  sign.position.set(70.5, 0.1, 10.0);
  const pole = cylinder(0.04, 0.04, 2.7, toon(0x5a5a62));
  pole.position.y = 1.35;
  const plate = createLabel('WC →', 0.7, 0.4, {
    width: 256,
    height: 146,
    font: 'bold 96px "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    background: '#0a6e3a',
  });
  plate.position.y = 2.5;
  plate.rotation.y = -Math.PI / 2;
  sign.add(pole, plate);
  return sign;
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

function everyoneLooksAt(cast: FamilyCast, target: Vector3): void {
  [cast.papa, cast.mama, cast.moana].forEach((person) => turnHeadTowards(person.head, FAMILY_YAW, target, 1.2));
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

const PARK_CAMERA = new Vector3(67.5, 1.0, 9.0);
/** Driver's door → round the bonnet → onto the sidewalk. */
const WALK_PATH = [
  new Vector3(60.15, 1.25, 3.35),
  new Vector3(60.4, EYE_HEIGHT, 3.1),
  new Vector3(63.1, EYE_HEIGHT, 3.3),
  ALAIN_SPOT,
];
const WALK_TIMES = [9.5, 10.2, 11.8, 13.3];

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

/**
 * Loaded with bananas, Alain needs the loo. He parks near the station, gets out — and a family
 * comes along the sidewalk. Moana is eating a banana; the toddler in the pram spots the B05,
 * pushes up its sunglasses, the pacifier drops, and it points: "Den will ich als Götti haben!"
 */
export function parkAndMeetFamily(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, sounds, stage } = world;
  const { kid } = cast;
  const startDistance = world.odometer;

  timeline.at(0.2, () => sounds.electricWhir(5));
  timeline.tween(0, 7, (_progress, elapsed) => {
    placeCar(world, lerp(startDistance, STOPS.parking, cruiseProgress(elapsed, 7, 2, 2.5)));
  }, ease.linear);
  timeline.at(1.2, () => callouts.say('Uff … so viele Bananen.', thoughts, 2, 0));
  timeline.at(3.5, () => callouts.say('… und jetzt muss ich auch noch dringend! 😬', thoughts, 3, 0));
  timeline.at(10.4, () => callouts.say('WC … wo ist hier ein WC?!', thoughts, 2.6, 0));
  for (let stepTime = 10.3; stepTime < 13.3; stepTime += 0.45) {
    timeline.at(stepTime, () => sounds.footstep());
  }

  // ── The family strolls along the sidewalk; Moana munches ────────────────────
  timeline.tween(FAMILY_WALK_START, FAMILY_WALK_SECONDS, (_progress, elapsed) => {
    const walked = (PRAM_START_X - PRAM_STOP_X) * cruiseProgress(elapsed, FAMILY_WALK_SECONDS, 0.5, 1.5);
    placeFamily(cast, PRAM_START_X - walked, walked);
    const isWalking = elapsed < FAMILY_WALK_SECONDS;
    walkCycle(cast.mama, walked * 4, isWalking ? 0.4 : 0);
    walkCycle(cast.moana, walked * 5, isWalking ? 0.45 : 0);
    walkCycle(cast.papa, walked * 4, isWalking ? 0.35 : 0);
    cast.papa.arms.forEach((arm) => {
      arm.rotation.x = -1.2;
    });
    cast.moana.arms[1].rotation.x = MOANA_HOLD_ARM;
  }, ease.linear);
  moanaBite(timeline, world, cast, 15);
  moanaBite(timeline, world, cast, 17.2);

  // ── The toddler spots the B05 ───────────────────────────────────────────────
  const kidBodyYaw = FAMILY_YAW;
  timeline.tween(19.3, 0.6, (progress) => {
    turnHeadTowards(kid.head, kidBodyYaw, CAR_LOOK, 1.0);
    kid.head.rotation.y *= progress;
  });
  timeline.tween(20, 0.6, (progress) => {
    kid.sunglasses.position.y = lerp(0.04, 0.2, progress);
    kid.sunglasses.rotation.x = lerp(0, -0.6, progress);
  }, ease.out);
  timeline.at(20.3, () => kid.eyes.forEach((eye) => {
    eye.visible = true;
  }));
  for (const pingTime of [20.8, 21.1]) {
    timeline.at(pingTime, () => sounds.ping(3400));
  }
  timeline.tween(20.8, 0.8, (progress) => {
    cast.eyeSparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin((progress * 1.4 - index * 0.2) * Math.PI)) * 0.3);
    });
  }, ease.linear);
  let pacifierStartY = 0;
  timeline.at(21.4, () => {
    stage.scene.attach(kid.pacifier);
    pacifierStartY = kid.pacifier.position.y;
  });
  timeline.tween(21.45, 0.45, (progress) => {
    kid.pacifier.position.y = lerp(pacifierStartY, 0.13, progress);
    kid.pacifier.rotation.x = progress * 2;
  }, ease.in);
  timeline.at(21.9, () => {
    sounds.plop();
    callouts.show('PLOPP!', kid.pacifier, 1.2, 0.2);
  });
  timeline.tween(22, 0.4, (progress) => {
    kid.wavingArm.rotation.set(lerp(0.9, 1.3, progress), 0, lerp(0, 0.8, progress));
  });
  timeline.at(22.4, () => {
    sounds.squeal();
    callouts.say('Den will ich als Götti haben!', kid.head, 5, 0.45);
  });
  timeline.tween(22.4, 1.6, (_progress, elapsed) => {
    kid.whistleMouth.scale.set(1.2, 1.2 + Math.sin(elapsed * 14) * 0.2, 0.6);
  }, ease.linear);
  timeline.tween(24.5, 0.5, (progress) => {
    everyoneLooksAt(cast, ALAIN_SPOT);
    [cast.papa, cast.mama, cast.moana].forEach((person) => {
      person.head.rotation.y *= progress;
    });
  });

  // ── Camera ──────────────────────────────────────────────────────────────────
  const eye = new Vector3();
  const target = new Vector3();
  const family = new Vector3();
  const kidHead = new Vector3();
  direct(timeline, world, [
    {
      until: 6,
      view: 'driver',
      fov: POV_FOV,
      // Fidgeting — he really has to go.
      frame: (elapsed) => driverCamera(world, Math.sin(elapsed * 9) * 0.015),
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
        walkPosition(elapsed, eye);
        // Hopping from one foot to the other.
        eye.y += Math.abs(Math.sin(elapsed * 7)) * 0.05;
        const turnToFamily = MathUtils.clamp((elapsed - 11.8) / 1.6, 0, 1);
        target.set(eye.x + 5, eye.y - 0.3, eye.z + 1.5).lerp(family.set(72, 1.3, PRAM_Z), turnToFamily);
        aim(world, eye, target);
      },
    },
    {
      until: 19.2,
      view: 'walker',
      fov: POV_FOV,
      frame: (elapsed) => {
        eye.copy(ALAIN_SPOT);
        eye.y += Math.abs(Math.sin(elapsed * 7)) * 0.03;
        aim(world, eye, family.copy(cast.pram.root.position).setY(1.1));
      },
    },
    {
      until: 24.5,
      view: 'free',
      fov: 34,
      frame: () => {
        kid.head.getWorldPosition(kidHead);
        aim(world, eye.set(ALAIN_SPOT.x + 0.9, 1.2, ALAIN_SPOT.z + 0.35), kidHead);
      },
    },
    {
      until: 26.5,
      view: 'walker',
      fov: 50,
      frame: () => aim(world, ALAIN_SPOT, family.copy(cast.pram.root.position).setY(1.0)),
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
    cast.eyeSparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin(elapsed * 2.5 + index * 1.4)) ** 10 * 0.25);
    });
    everyoneLooksAt(cast, ALAIN_SPOT);
    turnHeadTowards(kid.head, FAMILY_YAW, ALAIN_SPOT, 1.0);
  }, ease.linear);
  timeline.at(4, () => world.callouts.say('Bitte, bitte, bitte!', kid.head, 2.5, 0.45));
  return timeline;
}

function holdFamilyShot(timeline: Timeline, world: World, cast: FamilyCast, duration: number): void {
  const target = new Vector3();
  direct(timeline, world, [
    {
      until: duration,
      view: 'walker',
      fov: 50,
      frame: () => aim(world, ALAIN_SPOT, target.copy(cast.pram.root.position).setY(1.0)),
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
  timeline.at(5.2, () => callouts.say('Willkommen in der Familie! 💛', mama.head, 3, 0.45));
  holdFamilyShot(timeline, world, cast, 8.5);
  return timeline;
}

/** Vielleicht: sunglasses back down, very cool, "I'll ask again tomorrow." */
export function maybeEnding(world: World, cast: FamilyCast): Timeline {
  const timeline = new Timeline();
  const { callouts } = world;
  const { kid, papa } = cast;
  timeline.tween(0.3, 2.2, (progress) => {
    kid.sunglasses.position.y = lerp(0.2, 0.04, progress);
    kid.sunglasses.rotation.x = lerp(-0.6, 0, progress);
  }, ease.inOut);
  timeline.at(1.6, () => kid.eyes.forEach((eye) => {
    eye.visible = false;
  }));
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
    kid.whistleMouth.scale.set(1.4, 0.4, 0.6);
    world.callouts.show('SCHNIEF.', kid.head, 1.4, 0.5);
  });
  timeline.tween(0.4, 0.5, (progress) => {
    papa.arms.forEach((arm) => {
      arm.rotation.set(lerp(-2.7, -1.2, progress), 0, 0);
    });
  });
  timeline.at(1.4, () => world.sounds.ping(3400));
  timeline.tween(1.4, 0.6, (progress) => {
    cast.eyeSparkles.forEach((sparkle) => {
      sparkle.scale.setScalar(Math.sin(progress * Math.PI) * 0.3);
    });
  }, ease.linear);
  holdFamilyShot(timeline, world, cast, 2.8);
  return timeline;
}
