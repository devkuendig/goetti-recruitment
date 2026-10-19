import { Vector3 } from 'three';
import { createB05, createSparkle } from '../assets/b05';
import { CITY, createCity, MIGROS, RAILWAY } from '../assets/city';
import { createDog, createPasserby, createSchoolkid, walkCycle, type PasserbyLook } from '../assets/people';
import { createPigeon, createTrain, furnishStreet } from '../assets/streetFurniture';
import { setOutlineThickness } from '../engine/build';
import type { Stage } from '../engine/stage';
import { ease, lerp, Timeline } from '../engine/timeline';

/** Long enough that nobody waits that long on the title screen; the loops simply stop then. */
const TITLE_LOOP_SECONDS = 3600;
const OUTLINE = { background: 0.0022, character: 0.005 } as const;

/** Migros on the left, then the square and the station on the right, the railway bridge at the edge. */
const CAMERA_POSITION = new Vector3(8.5, 2.6, 7.5);
const CAMERA_TARGET = new Vector3(28, 4, -12);
const CAMERA_FOV = 60;

/** The train comes over the bridge from the near side and pulls into the station (towards -z). */
const TRAIN_START_Z = 120;
const TRAIN_STOP_Z = -110;
const TRAIN_ARRIVAL_SECONDS = 10;
const TRAIN_CYCLE_SECONDS = 14;

/** B05 parked in the outer far lane right in front of the Migros. */
const B05_POSITION = new Vector3(15.5, 0, CITY.farOuterLaneZ);
const B05_ROOF_HEIGHT = 1.58;

const ADMIRERS: { look: PasserbyLook; x: number; z: number; yaw: number }[] = [
  { look: { shirt: 0xe2453b, trousers: 0x3b4a6b, hair: 0x4a2f1b, hairStyle: 'short', backpack: 0x2f7f5f }, x: 13.2, z: -7.3, yaw: 0.3 },
  { look: { shirt: 0x39c0e0, trousers: 0x222228, hair: 0xc98a3a, hairStyle: 'ponytail', backpack: 0xf2a33a }, x: 14.4, z: -7.6, yaw: 0 },
  { look: { shirt: 0xf3e3a1, trousers: 0x6b5a3b, hair: 0x1c1c1c, hairStyle: 'short', skin: 0xb07a50, backpack: 0xe2453b }, x: 16.6, z: -7.5, yaw: -0.1 },
];

const SHOPPERS: { look: PasserbyLook; x: number; z: number; yaw: number }[] = [
  { look: { shirt: 0xffc23d, trousers: 0x222228, hair: 0x1c1c1c, hairStyle: 'short', backpack: 0xe2453b }, x: MIGROS.doorX, z: -10.2, yaw: Math.PI },
  { look: { shirt: 0xff7fa8, trousers: 0x3b4a6b, hair: 0xc98a3a, hairStyle: 'ponytail', backpack: 0x39c0e0 }, x: 19.2, z: -9.4, yaw: Math.PI / 2 + 0.4 },
  { look: { shirt: 0x2f5fa5, trousers: 0x5a5a62, hair: 0x4a2f1b, hairStyle: 'short', skin: 0x8a5a3c, backpack: 0xffc23d }, x: 18.2, z: -9.4, yaw: Math.PI / 2 },
  { look: { shirt: 0xb5d3f0, trousers: 0x6b5a3b, hair: 0x1c1c1c, hairStyle: 'bun', backpack: 0x6cc070 }, x: 17.2, z: -9.3, yaw: Math.PI / 2 },
];

/**
 * Title still: the Migros Neuwiesen across Zürcherstrasse; to its right the square and Winterthur
 * station, a train pulling in over the bridge. A man has walked face-first into
 * the shop window, a school class squeezes through the sliding doors (the last one waves),
 * another group gawks at the B05 parked in front — with a pigeon claiming its roof.
 */
export function buildTitleScene(stage: Stage): Timeline {
  const { scene, camera } = stage;
  const timeline = new Timeline();
  const city = createCity(scene);
  city.root.add(furnishStreet());
  const [leftDoor, rightDoor] = city.migrosDoors;
  leftDoor.position.x = MIGROS.doorX - 1.7;
  rightDoor.position.x = MIGROS.doorX + 1.7;

  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);
  camera.fov = CAMERA_FOV;
  camera.updateProjectionMatrix();

  setOutlineThickness(city.root, OUTLINE.background);

  // Crosses the bridge, brakes into the station, then the next one comes.
  const train = createTrain({ body: 0xffffff, stripe: 0x2f5fa5, doors: 0xd52b1e, label: 'S12', cars: 3 });
  train.rotation.y = Math.PI;
  train.position.set(RAILWAY.trackX[0], RAILWAY.deckY, TRAIN_START_Z);
  scene.add(train);

  const b05 = createB05(0x2f7fe0);
  b05.root.position.copy(B05_POSITION);
  scene.add(b05.root);

  const pigeon = createPigeon();
  pigeon.root.position.set(B05_POSITION.x + 0.1, B05_ROOF_HEIGHT, B05_POSITION.z);
  pigeon.root.rotation.y = 0.8;
  scene.add(pigeon.root);

  // Walked straight into the shop window while staring at the B05.
  const windowVictim = createPasserby({
    shirt: 0xffc23d,
    trousers: 0x3b4a6b,
    hair: 0x4a2f1b,
    hairStyle: 'short',
    bag: 0x8a5a2c,
  });
  windowVictim.root.position.set(MIGROS.startX + 4.5, 0, MIGROS.facadeZ + 0.3);
  windowVictim.root.rotation.set(-0.12, Math.PI, 0);
  windowVictim.head.rotation.y = -0.4;
  windowVictim.mouth.scale.set(1.4, 0.4, 0.5);
  windowVictim.dizzyStars.visible = true;

  const admirers = ADMIRERS.map(({ look, x, z, yaw }) => {
    const admirer = createSchoolkid(look);
    admirer.root.position.set(x, 0, z);
    admirer.root.rotation.y = yaw;
    admirer.mouth.scale.set(1, 1.1, 0.5);
    return admirer;
  });
  const [pointer, hopper] = admirers;
  pointer.arms[1].rotation.x = -1.5;

  const photographer = createSchoolkid({
    shirt: 0x6cc070,
    trousers: 0x5b3a6b,
    hair: 0x1c1c1c,
    hairStyle: 'bun',
    glasses: true,
    backpack: 0x3a6ea5,
  });
  photographer.root.position.set(17.8, 0, -7.1);
  photographer.root.rotation.y = -0.5;
  photographer.arms.forEach((arm) => arm.rotation.set(-1.45, 0, 0));
  const phoneFlash = createSparkle();
  phoneFlash.position.set(0, -0.68, 0.12);
  photographer.arms[1].add(phoneFlash);

  const shoppers = SHOPPERS.map(({ look, x, z, yaw }) => {
    const shopper = createSchoolkid(look);
    shopper.root.position.set(x, 0, z);
    shopper.root.rotation.y = yaw;
    return shopper;
  });
  // The last one in line turns round and waves at the camera.
  const waver = createSchoolkid({
    shirt: 0xf2a33a,
    trousers: 0x222228,
    hair: 0x8a5a2c,
    hairStyle: 'short',
    glasses: true,
    backpack: 0x2f5fa5,
  });
  waver.root.position.set(16.1, 0, -9.1);
  waver.root.rotation.y = -0.35;
  waver.mouth.scale.set(1.3, 0.9, 0.5);

  const pensioner = createPasserby({
    shirt: 0x9a7a5a,
    trousers: 0x5a5a62,
    hair: 0xdddddd,
    hairStyle: 'hat',
    glasses: true,
  });
  pensioner.root.position.set(24.5, 0, -8.2);
  pensioner.root.rotation.y = -1.2;

  const dogOwner = createPasserby({
    shirt: 0x4fa36a,
    trousers: 0x6b5a3b,
    hair: 0x8a8a8a,
    hairStyle: 'bald',
    beard: true,
  });
  dogOwner.root.position.set(11, 0, -8.8);
  dogOwner.root.rotation.y = 0.6;
  const dog = createDog();
  dog.root.position.set(11.9, 0, -7.9);
  dog.root.rotation.y = 0.9;

  const characters = [windowVictim, ...admirers, photographer, ...shoppers, waver, pensioner, dogOwner];
  characters.forEach((person) => scene.add(person.root));
  scene.add(dog.root);
  [...characters.map((person) => person.root), dog.root, pigeon.root].forEach((root) =>
    setOutlineThickness(root, OUTLINE.character),
  );

  timeline.tween(0, TITLE_LOOP_SECONDS, (_progress, elapsed) => {
    const arrival = Math.min(1, (elapsed % TRAIN_CYCLE_SECONDS) / TRAIN_ARRIVAL_SECONDS);
    train.position.z = lerp(TRAIN_START_Z, TRAIN_STOP_Z, ease.out(arrival));
    windowVictim.dizzyStars.rotation.y = elapsed * 5;
    windowVictim.root.rotation.z = Math.sin(elapsed * 2.5) * 0.05;
    hopper.root.position.y = Math.abs(Math.sin(elapsed * 6)) * 0.12;
    pointer.arms[1].rotation.z = Math.sin(elapsed * 4) * 0.08;
    waver.arms[1].rotation.z = 2.6 + Math.sin(elapsed * 9) * 0.35;
    shoppers.slice(1).forEach((shopper, index) => walkCycle(shopper, elapsed * 4 + index, 0.25));
    phoneFlash.scale.setScalar(Math.max(0, Math.sin(elapsed * 1.6)) ** 30 * 0.6);
    pensioner.head.rotation.y = Math.sin(elapsed * 7) * 0.3;
    dog.tail.rotation.y = Math.sin(elapsed * 18) * 0.6;
    pigeon.head.rotation.x = Math.max(0, Math.sin(elapsed * 3)) * 0.9;
    b05.sparkles.forEach((sparkle, index) => {
      sparkle.scale.setScalar(Math.max(0, Math.sin(elapsed * 2.3 + index * 1.9)) ** 8 * 0.45);
    });
    city.catTail.rotation.z = Math.sin(elapsed * 1.8) * 0.5;
  }, ease.linear);

  return timeline;
}
