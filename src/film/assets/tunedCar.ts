import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { box, cylinder, sphere, textTexture, toon } from '../engine/build';

export interface TunedCar {
  root: Group;
  /** Sprung part of the car — bounces to the bass. */
  body: Group;
  wheels: Mesh[];
  /** Where the driver sits, just inside the open front-left window. */
  driverSeat: Group;
  hoodPacifier: Group;
}

/** Lowered purple hatch with flames, spoiler and underglow. Faces -x, driver side is +z. */
export function createTunedCar(): TunedCar {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const paint = toon(0x7b3fc4);
  const tint = toon(0x111116);
  const chrome = toon(0xe8c34a);

  const chassis = box(4.6, 0.55, 2, paint);
  chassis.position.y = 0.48;
  body.add(chassis);

  const roof = box(1.9, 0.07, 1.7, paint);
  roof.position.set(0.05, 1.27, 0);
  body.add(roof);
  for (const x of [-0.9, 1]) {
    for (const z of [-0.82, 0.82]) {
      const pillar = box(0.08, 0.52, 0.06, paint);
      pillar.position.set(x, 1, z);
      body.add(pillar);
    }
  }
  const windshield = box(0.05, 0.5, 1.6, tint);
  windshield.position.set(-0.92, 1, 0);
  const rearGlass = box(0.05, 0.5, 1.6, tint);
  rearGlass.position.set(1.02, 1, 0);
  const passengerGlass = box(1.85, 0.5, 0.04, tint);
  passengerGlass.position.set(0.05, 1, -0.82);
  const rearDriverGlass = box(0.9, 0.5, 0.04, tint);
  rearDriverGlass.position.set(0.52, 1, 0.82);
  body.add(windshield, rearGlass, passengerGlass, rearDriverGlass);

  const seatBack = box(0.12, 0.55, 0.5, toon(0x2b2b30));
  seatBack.position.set(-0.05, 0.98, 0.42);
  body.add(seatBack);

  const spoilerWing = box(0.5, 0.06, 2.1, tint);
  spoilerWing.position.set(2.1, 1.25, 0);
  body.add(spoilerWing);
  for (const z of [-0.7, 0.7]) {
    const strut = box(0.08, 0.5, 0.06, tint);
    strut.position.set(2.1, 0.98, z);
    body.add(strut);
  }
  const exhaust = cylinder(0.16, 0.16, 0.5, chrome);
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(2.4, 0.3, -0.6);
  body.add(exhaust);

  addFlames(body);
  body.add(createBabyOnBoardSticker());
  const hoodPacifier = createPacifier(0xff6fb5, 0.9);
  hoodPacifier.position.set(-2, 0.82, 0);
  body.add(hoodPacifier);

  const underglow = new Mesh(new PlaneGeometry(4.2, 2.2), new MeshBasicMaterial({ color: 0x39ff88 }));
  underglow.material.userData.outlineParameters = { visible: false };
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.02;
  root.add(underglow);

  const wheels = [-1.5, 1.5].flatMap((x) =>
    [-0.95, 0.95].map((z) => {
      const wheel = cylinder(0.34, 0.34, 0.3, toon(0x161616));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.34, z);
      const rim = cylinder(0.24, 0.24, 0.31, chrome);
      wheel.add(rim);
      root.add(wheel);
      return wheel;
    }),
  );

  const driverSeat = new Group();
  driverSeat.position.set(-0.4, 0.75, 0.42);
  body.add(driverSeat);

  return { root, body, wheels, driverSeat, hoodPacifier };
}

function addFlames(body: Group): void {
  const flameColors = [0xff5a1f, 0xffb21f, 0xff5a1f, 0xffd84a];
  flameColors.forEach((color, index) => {
    const flame = box(0.9 - index * 0.12, 0.08, 0.02, toon(color));
    flame.position.set(-1.6 + index * 0.2, 0.42 + index * 0.08, 1.01);
    flame.rotation.z = -0.15;
    body.add(flame);
  });
}

/** Flame-lettered sticker on the rear door — readable on the driver side. */
function createBabyOnBoardSticker(): Mesh {
  const texture = textTexture('🔥 BABY AN BORD 🔥', {
    width: 512,
    height: 128,
    font: 'bold 54px Impact, "Arial Black", sans-serif',
    color: '#ff5a1f',
    background: '#ffef9a',
  });
  const sticker = new Mesh(new PlaneGeometry(0.9, 0.22), new MeshBasicMaterial({ map: texture }));
  sticker.material.userData.outlineParameters = { visible: false };
  sticker.position.set(1.4, 0.55, 1.011);
  return sticker;
}

export function createPacifier(color: number, scale: number): Group {
  const pacifier = new Group();
  const shield = box(0.22, 0.14, 0.04, toon(color));
  const nipple = sphere(0.06, toon(0xf3e2b0));
  nipple.position.z = -0.05;
  const ring = cylinder(0.07, 0.07, 0.03, toon(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.06;
  pacifier.add(shield, nipple, ring);
  pacifier.scale.setScalar(scale);
  return pacifier;
}
