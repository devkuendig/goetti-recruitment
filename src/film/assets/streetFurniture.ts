import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, TorusGeometry } from 'three';
import { box, cylinder, sphere, textTexture, toon } from '../engine/build';
import { CITY } from './city';
import { createWheel } from './carParts';

/** Benches, bikes, bins & co. Placed clear of Alain's walk (z ≈ 8.3) and the gawker's path (z ≈ 7.3). */
export function furnishStreet(): Group {
  const street = new Group();
  const place = (object: Group, x: number, z: number, rotationY = 0) => {
    object.position.set(x, 0.1, z);
    object.rotation.y = rotationY;
    street.add(object);
  };

  place(createBench(), -9, 10.0, Math.PI);
  place(createBench(), 14, -10.0);
  for (const x of [-13, -6.8, 1.6, 10.5]) {
    place(createFlowerBox(), x, 10.2);
  }
  for (const x of [-15, -3, 8.5, 18]) {
    place(createFlowerBox(), x, -10.2);
  }
  place(createBike(0x2fa4d9), -2.4, 9.95, 0.15);
  place(createBike(0xe2453b), -1.5, 10.0, -0.1);
  place(createBike(0xf2c230), 11.5, -9.95, Math.PI + 0.1);
  place(createTrashCan(), -11, 6.85);
  place(createTrashCan(), 9.5, -6.85);
  place(createParkingMeter(), -0.2, 6.8);
  place(createHydrant(), 7.6, 6.85);
  place(createHydrant(), -8, -6.85);
  place(createBusStop(), -18, -8.6);
  return street;
}

export function createBench(): Group {
  const bench = new Group();
  const wood = toon(0xb07a4a);
  const metal = toon(0x3a3a40);
  for (let plank = 0; plank < 3; plank++) {
    const seat = box(1.8, 0.05, 0.14, wood);
    seat.position.set(0, 0.45, -0.18 + plank * 0.17);
    bench.add(seat);
  }
  const backrest = box(1.8, 0.3, 0.05, wood);
  backrest.position.set(0, 0.75, -0.28);
  bench.add(backrest);
  for (const x of [-0.75, 0.75]) {
    const leg = box(0.06, 0.45, 0.5, metal);
    leg.position.set(x, 0.22, -0.05);
    bench.add(leg);
  }
  return bench;
}

export function createFlowerBox(): Group {
  const flowerBox = new Group();
  const planter = box(1.4, 0.45, 0.5, toon(0x8a6a4a));
  planter.position.y = 0.22;
  const soil = box(1.3, 0.05, 0.4, toon(0x5a3a22));
  soil.position.y = 0.45;
  flowerBox.add(planter, soil);
  const blossoms = [0xff6fa5, 0xffd84a, 0xff8a3a, 0xc98aff, 0xffffff];
  for (let flower = 0; flower < 7; flower++) {
    const stem = cylinder(0.012, 0.012, 0.25, toon(0x3f8a3a));
    const x = -0.55 + flower * 0.18;
    stem.position.set(x, 0.58, (flower % 2) * 0.1 - 0.05);
    const blossom = sphere(0.06, toon(blossoms[flower % blossoms.length]));
    blossom.position.set(x, 0.72, stem.position.z);
    flowerBox.add(stem, blossom);
  }
  return flowerBox;
}

/** Bicycle seen side-on along x, front (basket) towards -x. */
export function createBike(frameColor: number): Group {
  const bike = new Group();
  const frame = toon(frameColor);
  const tyre = toon(0x1a1a1e);
  for (const x of [-0.5, 0.5]) {
    const wheel = new Mesh(new TorusGeometry(0.32, 0.025, 6, 24), tyre);
    wheel.position.set(x, 0.33, 0);
    const hub = cylinder(0.03, 0.03, 0.06, toon(0xcccccc));
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(wheel.position);
    bike.add(wheel, hub);
  }
  const top = box(0.75, 0.035, 0.035, frame);
  top.position.set(0, 0.68, 0);
  const down = box(0.75, 0.035, 0.035, frame);
  down.position.set(-0.1, 0.5, 0);
  down.rotation.z = 0.45;
  const seatPost = box(0.035, 0.4, 0.035, frame);
  seatPost.position.set(0.25, 0.6, 0);
  const saddle = box(0.2, 0.04, 0.1, toon(0x2a2a2e));
  saddle.position.set(0.27, 0.82, 0);
  const fork = box(0.035, 0.45, 0.035, frame);
  fork.position.set(-0.45, 0.55, 0);
  fork.rotation.z = -0.2;
  const handlebar = box(0.04, 0.04, 0.45, toon(0x2a2a2e));
  handlebar.position.set(-0.4, 0.82, 0);
  const basket = box(0.25, 0.18, 0.3, toon(0xc9a56a));
  basket.position.set(-0.6, 0.78, 0);
  bike.add(top, down, seatPost, saddle, fork, handlebar, basket);
  return bike;
}

function createTrashCan(): Group {
  const can = new Group();
  const bin = cylinder(0.22, 0.2, 0.8, toon(0x3f8a5a));
  bin.position.y = 0.4;
  const lid = cylinder(0.24, 0.24, 0.06, toon(0x2f6a4a));
  lid.position.y = 0.82;
  // A banana peel sticking out — someone missed their aim.
  const peel = box(0.06, 0.16, 0.03, toon(0xffd84a));
  peel.position.set(0.1, 0.92, 0);
  peel.rotation.z = -0.5;
  can.add(bin, lid, peel);
  return can;
}

function createParkingMeter(): Group {
  const meter = new Group();
  const post = cylinder(0.04, 0.04, 1.1, toon(0x5a5a62));
  post.position.y = 0.55;
  const head = box(0.2, 0.3, 0.16, toon(0x2f5fa5));
  head.position.y = 1.2;
  const display = box(0.12, 0.08, 0.01, toon(0x9fe8a0, 0x225522));
  display.position.set(0, 1.26, 0.085);
  meter.add(post, head, display);
  return meter;
}

function createHydrant(): Group {
  const hydrant = new Group();
  const red = toon(0xd93a2f);
  const body = cylinder(0.12, 0.14, 0.6, red);
  body.position.y = 0.3;
  const cap = sphere(0.12, red);
  cap.position.y = 0.6;
  for (const side of [-1, 1]) {
    const nozzle = cylinder(0.05, 0.05, 0.12, toon(0xb52a22));
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(side * 0.15, 0.42, 0);
    hydrant.add(nozzle);
  }
  hydrant.add(body, cap);
  return hydrant;
}

function textPlate(text: string, width: number, height: number, colors: { color: string; background: string }): Mesh {
  const texture = textTexture(text, {
    width: 512,
    height: Math.round((512 * height) / width),
    font: `bold ${Math.round((512 * height) / width) * 0.55}px Arial, sans-serif`,
    ...colors,
  });
  const plate = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: texture }));
  plate.material.userData.outlineParameters = { visible: false };
  return plate;
}

/** Bus shelter on the far sidewalk, facing the street (+z). */
function createBusStop(): Group {
  const stop = new Group();
  const frame = toon(0x3a3a40);
  const glass = toon(0xbfe0f0);
  const roof = box(2.6, 0.1, 1.3, frame);
  roof.position.y = 2.4;
  const backPane = box(2.5, 1.9, 0.04, glass);
  backPane.position.set(0, 1.35, -0.6);
  stop.add(roof, backPane);
  for (const x of [-1.25, 1.25]) {
    const post = box(0.07, 2.4, 0.07, frame);
    post.position.set(x, 1.2, -0.6);
    stop.add(post);
  }
  const pole = cylinder(0.04, 0.04, 2.6, frame);
  pole.position.set(1.7, 1.3, 0.2);
  const sign = textPlate('STADTBUS WINTERTHUR', 1.1, 0.3, { color: '#ffffff', background: '#0a6e3a' });
  sign.position.set(1.7, 2.5, 0.25);
  const halt = textPlate('H', 0.4, 0.4, { color: '#0a6e3a', background: '#ffd200' });
  halt.position.set(1.7, 2.1, 0.25);
  stop.add(pole, sign, halt);
  return stop;
}

export interface Bus {
  root: Group;
  wheels: Group[];
}

/** City bus driving in the far lane (faces -x). */
export function createBus(): Bus {
  const root = new Group();
  const paint = toon(0x0a8a4a);
  const body = box(11, 2.6, 2.5, paint);
  body.position.y = 1.65;
  const roofUnit = box(3, 0.3, 1.8, toon(0xe9e2d6));
  roofUnit.position.set(1, 3.1, 0);
  const windshield = box(0.05, 1.3, 2.3, toon(0x1d2a3a));
  windshield.position.set(-5.52, 2.1, 0);
  root.add(body, roofUnit, windshield);
  for (const side of [1, -1]) {
    const windowBand = box(9.6, 1.0, 0.04, toon(0x1d2a3a));
    windowBand.position.set(0.4, 2.2, side * 1.26);
    const label = textPlate('STADTBUS WINTERTHUR', 4, 0.45, { color: '#ffffff', background: '#0a8a4a' });
    label.position.set(1, 1.2, side * 1.27);
    label.rotation.y = side > 0 ? 0 : Math.PI;
    root.add(windowBand, label);
  }
  const lineNumber = textPlate('1  OBERWINTERTHUR', 1.8, 0.3, { color: '#ffb000', background: '#111111' });
  lineNumber.position.set(-5.56, 2.95, 0);
  lineNumber.rotation.y = -Math.PI / 2;
  root.add(lineNumber);
  const wheels = [-3.6, 3.6].flatMap((x) =>
    [-1, 1].map((side) => {
      const wheel = createWheel({ radius: 0.5, width: 0.3, rimColor: 0xcccccc, spokes: 4 });
      wheel.position.set(x, 0.5, side * 1.15);
      root.add(wheel);
      return wheel;
    }),
  );
  root.position.z = CITY.farLaneZ;
  return { root, wheels };
}

export interface TrainLivery {
  body: number;
  stripe: number;
  doors: number;
  label: string;
  cars: number;
}

const TRAIN_CAR_LENGTH = 24;
const TRAIN_CAR_GAP = 0.6;

/** Passenger train running along z. Origin = front nose, cars trail behind in -z. */
export function createTrain(livery: TrainLivery): Group {
  const root = new Group();
  const length = TRAIN_CAR_LENGTH;
  for (let car = 0; car < livery.cars; car++) {
    const carGroup = new Group();
    carGroup.position.z = -car * (length + TRAIN_CAR_GAP) - length / 2;
    const body = box(3, 3.4, length, toon(livery.body));
    body.position.y = 2.4;
    const underframe = box(2.6, 0.7, length - 2, toon(0x2a2a30));
    underframe.position.y = 0.45;
    const windowBand = box(3.04, 0.9, length - 3, toon(0x1d2a3a));
    windowBand.position.y = 2.8;
    const stripe = box(3.04, 0.35, length, toon(livery.stripe));
    stripe.position.y = 1.35;
    const roof = box(2.6, 0.3, length - 1, toon(0xb5b5b8));
    roof.position.y = 4.25;
    carGroup.add(body, underframe, windowBand, stripe, roof);
    for (const doorZ of [-length * 0.3, length * 0.3]) {
      const door = box(3.06, 2.3, 1.3, toon(livery.doors));
      door.position.set(0, 1.95, doorZ);
      carGroup.add(door);
    }
    for (const side of [-1, 1]) {
      const label = textPlate(livery.label, 3, 0.5, { color: '#ffffff', background: '#1d2a3a' });
      label.position.set(side * 1.53, 3.75, 0);
      label.rotation.y = (side * Math.PI) / 2;
      carGroup.add(label);
    }
    root.add(carGroup);
  }
  const windshield = box(2.6, 1.2, 0.05, toon(0x1d2a3a));
  windshield.position.set(0, 3.0, 0.03);
  const headlights = [-0.9, 0.9].map((x) => {
    const light = box(0.3, 0.2, 0.05, toon(0xfff3b0, 0xfff3b0));
    light.position.set(x, 1.4, 0.03);
    return light;
  });
  const pantograph = box(1.6, 0.08, 0.08, toon(0x3a3a40));
  pantograph.position.set(0, 4.9, -length * 0.4);
  const pantographArm = box(0.06, 0.8, 0.06, toon(0x3a3a40));
  pantographArm.position.set(0, 4.5, -length * 0.4);
  pantographArm.rotation.x = 0.4;
  root.add(windshield, ...headlights, pantograph, pantographArm);
  return root;
}

/** Zebra crossing across the whole road at `x` (stripes run along the traffic, like in Switzerland). */
export function createZebraCrossing(x: number): Group {
  const crossing = new Group();
  const paint = toon(0xf4f1e6);
  for (let z = -CITY.curbZ + 0.5; z < CITY.curbZ - 0.3; z += 1) {
    const stripe = box(3, 0.02, 0.5, paint);
    stripe.position.set(x, 0.012, z);
    crossing.add(stripe);
  }
  return crossing;
}

export interface Snail {
  root: Group;
  /** Two eye stalks; wiggle them with `rotation.x`. */
  stalks: [Group, Group];
}

/** Garden snail with a spiral shell, crawling towards +z. */
export function createSnail(): Snail {
  const root = new Group();
  const skin = toon(0xc9b48a);
  const foot = box(0.07, 0.04, 0.24, skin);
  foot.position.set(0, 0.02, 0.02);
  const shell = new Mesh(new TorusGeometry(0.05, 0.035, 8, 16), toon(0xb5673a));
  shell.position.set(0, 0.1, -0.02);
  shell.rotation.y = Math.PI / 2;
  const shellCore = sphere(0.04, toon(0x8a4a2a));
  shellCore.position.copy(shell.position);
  root.add(foot, shell, shellCore);
  const stalks = [-1, 1].map((side) => {
    const stalk = new Group();
    stalk.position.set(side * 0.02, 0.04, 0.12);
    const stem = cylinder(0.006, 0.008, 0.08, skin);
    stem.position.y = 0.04;
    const eye = sphere(0.012, toon(0x1a1a22));
    eye.position.y = 0.085;
    stalk.add(stem, eye);
    stalk.rotation.z = side * 0.25;
    root.add(stalk);
    return stalk;
  }) as [Group, Group];
  return { root, stalks };
}
