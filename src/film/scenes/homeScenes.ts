import { Group, MathUtils, Vector3 } from 'three';
import { createSparkle, setIndicators } from '../assets/b05';
import { HOME, HOME_SPOTS, LAPTOP_CLOSED } from '../assets/home';
import { GLOW_INTENSITY } from '../engine/build';
import { cruiseProgress } from '../engine/route';
import type { ChoiceOption } from '../engine/story';
import { ease, lerp, Timeline } from '../engine/timeline';
import {
  aim,
  currentLookTarget,
  direct,
  driverCamera,
  EYE_HEIGHT,
  lookAlong,
  placeCar,
  POV_FOV,
  type LookKey,
  type Shot,
  type World,
} from './world';

const FLAT_EYE = new Vector3(-63.4, HOME.flatFloorY + EYE_HEIGHT, 16.4);
const ROOM_CENTER = new Vector3(-63, HOME.flatFloorY + 1.2, 12);
const IDLE_SECONDS = 3600;

export const ACTIVITY_QUESTION = 'Was möchtest du heute machen?';
export const ACTIVITY_OPTIONS: readonly ChoiceOption[] = [
  { icon: '🪂', label: 'Gleitschirm fliegen' },
  { icon: '💻', label: 'Arbeiten' },
  { icon: '🍌', label: 'Bananenbrot backen' },
];

/** Looks around the flat from a fixed standing spot, with a slight breathing sway. */
function flatShot(world: World, keys: readonly LookKey[], until: number, fov: Shot['fov'] = POV_FOV): Shot {
  const target = new Vector3();
  const eye = new Vector3();
  return {
    until,
    view: 'free',
    fov,
    frame: (elapsed) => {
      eye.copy(FLAT_EYE);
      eye.y += Math.sin(elapsed * 1.4) * 0.01;
      aim(world, eye, lookAlong(keys, elapsed, target));
    },
  };
}

/** Saturday morning. Alain stretches at the window, then looks round his flat. */
export function apartmentMorning(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts } = world;
  const windowLow = HOME_SPOTS.window.clone().setY(HOME_SPOTS.window.y - 0.9);
  timeline.at(0.6, () => callouts.showBanner('Alain alain Zuhaus', 'Samstagmorgen, Winterthur', 4.5));
  timeline.at(2, () => callouts.show('GÄHN!', thoughts, 1.6, 0));
  timeline.at(10, () => callouts.say('Hmm … was mache ich heute?', thoughts, 3.5, 0));
  direct(timeline, world, [
    flatShot(
      world,
      [
        { time: 0, target: windowLow },
        { time: 3, target: HOME_SPOTS.window },
        { time: 4.2, target: HOME_SPOTS.window },
        { time: 5.6, target: HOME_SPOTS.gear },
        { time: 7, target: HOME_SPOTS.laptop },
        { time: 8.5, target: HOME_SPOTS.bowl },
        { time: 9.8, target: ROOM_CENTER },
      ],
      13,
    ),
  ]);
  return timeline;
}

/** While the viewer decides: the clock ticks, Alain breathes. */
export function apartmentIdle(world: World): Timeline {
  const timeline = new Timeline();
  const target = new Vector3();
  timeline.tween(0, IDLE_SECONDS, (_progress, elapsed) => {
    target.copy(ROOM_CENTER);
    target.x += Math.sin(elapsed * 0.4) * 0.4;
    aim(world, FLAT_EYE, target);
  }, ease.linear);
  return timeline;
}

function zoomTo(fromFov: number, toFov: number, start: number, duration: number): (elapsed: number) => number {
  return (elapsed) => lerp(fromFov, toFov, ease.inOut(Math.min(1, Math.max(0, (elapsed - start) / duration))));
}

const GLIDER_CRASH_SPOT = new Vector3(-63.7, HOME.flatFloorY + 0.06, 12.5);

/**
 * Paragliding? The flag outside hangs limp. Alain tests the "wind" by blowing at the model glider
 * on the ceiling — the string snaps and it nosedives onto the floor. Crash risk: today, no thanks.
 */
function paraglidingReaction(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, home, sounds } = world;
  const glider = home.modelGlider;
  const hookPosition = glider.position.clone();
  const gliderLook = hookPosition.clone().setY(hookPosition.y - 0.5);
  timeline.at(1, () => callouts.say('Gleitschirmfliegen! 🪂', thoughts, 2.2, 0));
  // One hopeful twitch of the flag … then nothing.
  timeline.tween(3.8, 1.2, (progress) => {
    home.flag.rotation.x = Math.sin(progress * Math.PI) * 0.15;
  }, ease.linear);
  timeline.at(4.6, () => callouts.say('Hmm … kein Lüftchen?', thoughts, 1.6, 0));
  timeline.at(6.3, () => callouts.say('Testflug! 🌬️', thoughts, 1.2, 0));
  // A mighty puff: the model swings wildly …
  timeline.at(7.2, () => {
    sounds.whoosh();
    callouts.show('PUUUSTE!', thoughts, 1, -0.2);
  });
  timeline.tween(7.2, 0.7, (progress) => {
    glider.rotation.set(Math.sin(progress * Math.PI * 3) * 0.6, 0, Math.sin(progress * Math.PI * 2) * 0.4);
  }, ease.linear);
  // … the string snaps, and it spirals into the floor.
  timeline.at(7.9, () => {
    sounds.click();
    callouts.show('KNACKS!', glider, 0.8, 0.1);
    glider.children[0].visible = false;
  });
  timeline.tween(7.9, 0.9, (progress) => {
    glider.position.lerpVectors(hookPosition, GLIDER_CRASH_SPOT, progress);
    glider.rotation.set(progress * 1.4, progress * 9, -progress * 0.8);
  }, ease.in);
  timeline.at(8.8, () => {
    sounds.bonk();
    callouts.show('PLONK!', glider, 1.2, 0.3);
  });
  timeline.at(9.6, () => callouts.say('… Absturzgefahr. Heute lieber nicht. 😅', thoughts, 2.6, 0));
  direct(timeline, world, [
    flatShot(
      world,
      [
        { time: 0, target: ROOM_CENTER },
        { time: 1.2, target: HOME_SPOTS.gear },
        { time: 2.6, target: HOME_SPOTS.gear },
        { time: 3.6, target: HOME_SPOTS.flag },
        { time: 5.4, target: HOME_SPOTS.flag },
        { time: 6.4, target: gliderLook },
        { time: 7.9, target: gliderLook },
        { time: 8.8, target: GLIDER_CRASH_SPOT },
      ],
      12.4,
      (elapsed) => {
        // Zoom onto the limp flag, back out for the test flight.
        const zoomIn = MathUtils.clamp((elapsed - 3.6) / 1, 0, 1);
        const zoomOut = MathUtils.clamp((elapsed - 5.4) / 1, 0, 1);
        return lerp(POV_FOV, 32, ease.inOut(zoomIn) - ease.inOut(zoomOut) * 0.6);
      },
    ),
  ]);
  return timeline;
}

/** Work? The laptop greets him with an endless update. */
function workReaction(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, home, sounds } = world;
  timeline.at(1.4, () => sounds.click());
  timeline.tween(1.4, 0.6, (progress) => {
    home.laptopLid.rotation.x = lerp(LAPTOP_CLOSED, -0.25, progress);
  }, ease.out);
  timeline.at(2.5, () => callouts.say('Update 1 von 487?! 😩', thoughts, 2.5, 0));
  timeline.at(5.2, () => callouts.say('Heute nicht.', thoughts, 1.6, 0));
  timeline.tween(6, 0.25, (progress) => {
    home.laptopLid.rotation.x = lerp(-0.25, LAPTOP_CLOSED, progress);
  }, ease.in);
  timeline.at(6.25, () => {
    sounds.click();
    callouts.show('KLAPP!', home.laptopLid, 1.2, 0.2);
  });
  direct(timeline, world, [
    flatShot(
      world,
      [
        { time: 0, target: ROOM_CENTER },
        { time: 1.2, target: HOME_SPOTS.laptop },
      ],
      8,
      zoomTo(POV_FOV, 40, 1.2, 1),
    ),
  ]);
  return timeline;
}

/**
 * Banana bread? Recipe open, tin ready, oven preheating … and the fruit bowl holds a single peel
 * and a fruit fly.
 */
function bananaBreadReaction(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, home, sounds } = world;
  const setOven = (isOn: boolean) => {
    home.ovenLamp.color.set(isOn ? 0xffb040 : 0x3a2a10);
    home.ovenLamp.emissive.set(isOn ? 0xff8800 : 0x000000);
  };
  // Callouts pin to objects; these two mark the recipe and the oven.
  const [recipeAnchor, ovenAnchor] = [HOME_SPOTS.baking, HOME_SPOTS.oven].map((spot) => {
    const anchor = new Group();
    anchor.position.copy(spot);
    world.stage.scene.add(anchor);
    return anchor;
  });
  timeline.at(1, () => callouts.say('Bananenbrot backen! 🍌', thoughts, 2, 0));
  timeline.at(2.4, () => callouts.show('REZEPT ✔', recipeAnchor, 1.2, 0.2));
  timeline.at(3.6, () => {
    sounds.click();
    setOven(true);
    callouts.show('OFEN 180° 🔥', ovenAnchor, 1.6, 0.3);
  });
  timeline.at(6, () => callouts.show('LEER!', home.fruitFly, 1.4, 0.15));
  timeline.at(6.8, () => callouts.say('Keine einzige Banane im Haus?!', thoughts, 3, 0));
  timeline.at(9.3, () => {
    sounds.click();
    setOven(false);
  });
  direct(timeline, world, [
    flatShot(
      world,
      [
        { time: 0, target: ROOM_CENTER },
        { time: 1.6, target: HOME_SPOTS.baking },
        { time: 3.2, target: HOME_SPOTS.oven },
        { time: 4.6, target: HOME_SPOTS.oven },
        { time: 5.8, target: HOME_SPOTS.bowl },
      ],
      10,
      zoomTo(POV_FOV, 38, 1.2, 1.2),
    ),
  ]);
  return timeline;
}

export const ACTIVITY_REACTIONS: readonly ((world: World) => Timeline)[] = [
  paraglidingReaction,
  workReaction,
  bananaBreadReaction,
];

const KEY_REACH = new Vector3(-61.2, FLAT_EYE.y, 15.8);
const FLAT_DOOR = new Vector3(-60.2, HOME.flatFloorY + 1.3, 16.6);

/** The key on its hook winks at him. Spontaneous decision: a ride in the B05. */
export function grabKey(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, home, sounds, hands } = world;
  const start = currentLookTarget(world);
  timeline.at(1.5, () => sounds.ping(3000));
  timeline.tween(1.5, 0.6, (progress) => {
    home.keySparkle.scale.setScalar(Math.sin(progress * Math.PI) * 0.35);
  }, ease.linear);
  timeline.at(2, () => callouts.say('Dann halt eine Spritztour mit dem B05! 😎', thoughts, 3, 0));
  for (const stepTime of [3, 3.5, 4]) {
    timeline.at(stepTime, () => sounds.footstep());
  }
  timeline.at(4.4, () => {
    home.key.visible = false;
    sounds.click();
    callouts.show('KLIMPER!', thoughts, 1, -0.3);
  });
  timeline.tween(4.4, 0.4, (progress) => {
    hands.keyHand.position.set(0.3, lerp(-0.6, -0.34, progress), -0.62);
  }, ease.out);

  const target = new Vector3();
  const eye = new Vector3();
  const keys: LookKey[] = [
    { time: 0, target: start },
    { time: 1.4, target: HOME_SPOTS.keyHook },
    { time: 4.6, target: HOME_SPOTS.keyHook },
    { time: 5.6, target: FLAT_DOOR },
  ];
  const frame = (elapsed: number) => {
    const walked = ease.inOut(Math.min(1, Math.max(0, (elapsed - 2.8) / 1.6)));
    eye.lerpVectors(FLAT_EYE, KEY_REACH, walked);
    eye.y += Math.abs(Math.sin(walked * Math.PI * 3)) * 0.035;
    aim(world, eye, lookAlong(keys, elapsed, target));
  };
  direct(timeline, world, [
    { until: 4.4, view: 'free', fov: POV_FOV, frame },
    { until: 6.4, view: 'walker', fov: POV_FOV, frame },
  ]);
  return timeline;
}

const GARAGE_WIDE = new Vector3(-60.6, 2.2, 17.0);
const GARAGE_WIDE_TARGET = new Vector3(-63.3, 0.7, 12.5);
const HERO_POSITION = new Vector3(-61.0, 0.45, 10.95);
const HERO_TARGET = new Vector3(-63, 0.85, 13.6);

function setGarageLight(world: World, isOn: boolean): void {
  const { garageLamp, garageLight } = world.home;
  garageLamp.color.set(isOn ? 0xf4f8ff : 0x9a9a9a);
  garageLamp.emissive.set(isOn ? 0xf4f8ff : 0x000000);
  garageLamp.emissiveIntensity = GLOW_INTENSITY;
  garageLight.intensity = isOn ? 9 : 0;
}

/**
 * In the garage. Light flickers on, then a run of commercial-style cuts on the sparkling B05,
 * then Alain's POV from the driver's seat as the door rolls up and he pulls out.
 */
export function garageReveal(world: World): Timeline {
  const timeline = new Timeline();
  const { callouts, thoughts, home, sounds, b05 } = world;
  b05.root.updateMatrixWorld();
  const wheelPosition = b05.wheels[0].getWorldPosition(new Vector3());
  const wheelCamera = wheelPosition.clone().add(new Vector3(-1.15, 0.12, -0.9));
  const rimSparkle = createSparkle();
  rimSparkle.position.copy(wheelPosition).add(new Vector3(-0.2, 0.1, -0.05));
  world.stage.scene.add(rimSparkle);

  // ── Light on: KLICK, flicker, flicker, on ───────────────────────────────────
  timeline.at(0.6, () => {
    sounds.click();
    callouts.show('KLICK!', thoughts, 1, 0);
  });
  timeline.tween(0, 1.6, (_progress, elapsed) => {
    const flickering = elapsed > 0.6 && elapsed < 1.5;
    setGarageLight(world, elapsed >= 1.5 || (flickering && Math.floor(elapsed * 14) % 3 !== 0));
  }, ease.linear);

  // ── Hero cuts ───────────────────────────────────────────────────────────────
  timeline.at(3.1, () => sounds.ping(3200));
  timeline.tween(3.1, 0.7, (progress) => {
    rimSparkle.scale.setScalar(Math.sin(progress * Math.PI) * 0.6);
  }, ease.linear);
  timeline.at(5.3, () => {
    sounds.ping(2400);
    callouts.showBanner('Leapmotor B05', 'äusserst angesagt', 3);
  });
  timeline.tween(5.3, 1.2, (progress) => {
    b05.sparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin((progress * 2 - index * 0.15) * Math.PI)) * 1.1);
    });
  }, ease.linear);

  // ── Driver's seat: unlock, door up, off we go ───────────────────────────────
  timeline.at(8.5, () => {
    sounds.unlockBeep();
    callouts.show('BIP BIP!', thoughts, 1.2, 0);
  });
  timeline.tween(8.5, 0.8, (progress) => {
    setIndicators(b05, progress < 0.25 || (progress > 0.45 && progress < 0.7));
  }, ease.linear);
  timeline.at(9.2, () => sounds.garageDoor(2.5));
  timeline.tween(9.2, 2.5, (progress) => {
    home.garageDoor.scale.y = lerp(1, 0.06, progress);
  }, ease.inOut);
  const pullOutDistance = 1.3;
  timeline.at(11.6, () => sounds.electricWhir(3));
  timeline.tween(11.6, 2.4, (_progress, elapsed) => {
    placeCar(world, pullOutDistance * cruiseProgress(elapsed, 2.4, 1.2, 0));
  }, ease.linear);

  direct(timeline, world, [
    { until: 2.7, view: 'free', fov: 55, frame: () => aim(world, GARAGE_WIDE, GARAGE_WIDE_TARGET) },
    {
      until: 5.1,
      view: 'free',
      fov: 38,
      frame: (elapsed) => {
        const dolly = (elapsed - 2.7) * 0.08;
        aim(world, wheelCamera.clone().add(new Vector3(dolly, 0, dolly)), wheelPosition);
      },
    },
    {
      until: 8.3,
      view: 'free',
      fov: 42,
      frame: (elapsed) => aim(world, HERO_POSITION.clone().lerp(HERO_TARGET, (elapsed - 5.1) * 0.03), HERO_TARGET),
    },
    { until: 14, view: 'driver', fov: POV_FOV, frame: () => driverCamera(world) },
  ]);
  return timeline;
}
