import {
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  Euler,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three';
import { box, cylinder, GeometryBatch, sphere, textTexture, toon } from '../engine/build';
import { createSparkle } from './b05';

/**
 * Street runs along x. Road z ∈ [-6.5, 6.5] with two 3 m lanes per direction
 * (traffic towards +x on z > 0, towards -x on z < 0), sidewalks out to |z| = 10.5, buildings beyond.
 * The B05's painted parking bay sits in the outer +z lane.
 */
export const CITY = {
  sidewalkZ: 8.3,
  curbZ: 6.5,
  laneWidth: 3,
  farLaneZ: -1.5,
  farOuterLaneZ: -4.5,
  parkingZ: 5.3,
} as const;

export const LAMP_POST_X = -5;

const FACADE_Z = 10.5;

/**
 * Migros on the left side of Zürcherstrasse (seen from Alain, walking +x towards the station).
 * The building spans x ∈ [startX, endX] in the far building row (z < 0).
 */
export const MIGROS = {
  startX: 8,
  endX: 28,
  doorX: 20,
  facadeZ: -FACADE_Z,
} as const;

/** Winterthur station on the far side, past the square after the Migros, next to the railway. */
export const STATION = {
  startX: 40,
  endX: 72,
  frontZ: -15,
} as const;

/** Railway bridge across the far end of the street, beside the station. Trains run along z. */
export const RAILWAY = {
  frontX: 76,
  backX: 84,
  deckY: 5.6,
  trackX: [78.5, 81.5],
} as const;

const BUILDING_DEPTH = 8;
const FLOOR_HEIGHT = 3;
const SKY_HORIZON = new Color(0xe6f5ff);
const SKY_ZENITH = new Color(0x56aef0);
const SUN_DIRECTION = new Vector3(20, 30, 15).normalize();

/** Sober Winterthur plaster tones — beige, sandstone, light grey. */
const BUILDING_COLORS = [0xe8e2d6, 0xd9d4cc, 0xefe6d2, 0xcfd3d6, 0xe6d8c3, 0xdcdcd4, 0xf0ebe0];
const SHUTTER_COLORS = [0x3f6a4a, 0x5a6b7a, 0x6b5a4a, 0x4a5a6a];
const AWNING_COLORS: [number, number][] = [
  [0x6b6b70, 0xe9e2d6],
  [0x3f6a4a, 0xe9e2d6],
  [0x7a3b2c, 0xe9e2d6],
  [0x3a4a6a, 0xe9e2d6],
];
const SHOP_NAMES = ['APOTHEKE', 'BÄCKEREI', 'COIFFEUR', 'KIOSK', 'OPTIK', 'CAFÉ', 'VELOS'];
const MIGROS_ORANGE = 0xff6600;

export interface City {
  root: Group;
  lampPost: Group;
  clouds: Group[];
  catTail: Group;
  /** Sliding entrance doors, left and right panel. Slide them apart along x to open. */
  migrosDoors: [Mesh, Mesh];
}

export function createCity(scene: Scene): City {
  scene.background = SKY_HORIZON.clone();
  scene.fog = new Fog(SKY_HORIZON, 50, 150);
  addLighting(scene);
  scene.add(createSkyDome());

  const root = new Group();
  root.add(createGround());
  root.add(createBuildingRow(1));
  root.add(createBuildingRow(-1));
  const migros = createMigros();
  root.add(migros.root);
  root.add(createRailwayBridge());
  root.add(createStationSquare());
  const station = createStation();
  station.position.set((STATION.startX + STATION.endX) / 2, 0, STATION.frontZ);
  root.add(station);
  for (const x of [-22, -10, 12, 24]) {
    root.add(createTree(x, FACADE_Z - 0.7));
    root.add(createTree(x + 5, -(FACADE_Z - 0.7)));
  }
  const lampPost = createLampPost();
  lampPost.position.set(LAMP_POST_X, 0, CITY.curbZ + 0.4);
  root.add(lampPost);

  const cat = createWindowCat();
  cat.root.position.set(5.0, 3.8, -FACADE_Z + 0.22);
  root.add(cat.root);

  const clouds = [-30, -5, 20, 40].map((x, index) => {
    const cloud = createCloud();
    cloud.position.set(x, 26 + (index % 2) * 4, -30 - index * 6);
    root.add(cloud);
    return cloud;
  });

  scene.add(root);
  return { root, lampPost, clouds, catTail: cat.tail, migrosDoors: migros.doors };
}

function addLighting(scene: Scene): void {
  scene.add(new HemisphereLight(0xcfe9ff, 0x9a8466, 1.05));
  scene.add(new AmbientLight(0xfff4e6, 0.3));
  const sun = new DirectionalLight(0xffe2b8, 2.9);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.radius = 4;
  sun.shadow.blurSamples = 12;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
}

/** Vertical gradient dome plus a glowing sun disc (the bloom pass makes it shine). */
function createSkyDome(): Group {
  const sky = new Group();
  const geometry = new SphereGeometry(300, 32, 16);
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];
  const color = new Color();
  for (let index = 0; index < positions.count; index++) {
    const height = Math.max(0, positions.getY(index) / 300);
    color.copy(SKY_HORIZON).lerp(SKY_ZENITH, Math.pow(height, 0.6));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const dome = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false }));
  dome.material.userData.outlineParameters = { visible: false };
  sky.add(dome);

  const sunDisc = createSparkle();
  sunDisc.material.color.set(0xfff2c0).multiplyScalar(3);
  sunDisc.material.fog = false;
  sunDisc.scale.setScalar(40);
  sunDisc.position.copy(SUN_DIRECTION).multiplyScalar(280);
  sky.add(sunDisc);
  return sky;
}

function createGround(): Group {
  const batch = new GeometryBatch();
  const sidewalkWidth = FACADE_Z - CITY.curbZ;
  const sidewalkCenter = CITY.curbZ + sidewalkWidth / 2;
  batch.box([200, 0.1, CITY.curbZ * 2], 0x5b6070, [0, -0.05, 0]);
  for (const side of [1, -1]) {
    batch.box([200, 0.2, sidewalkWidth], 0xd9d2c5, [0, 0, side * sidewalkCenter]);
    batch.box([200, 0.22, 0.2], 0xb9b2a5, [0, 0, side * (CITY.curbZ + 0.05)]);
    // Paving joints so the sidewalk doesn't read as one flat slab.
    for (let x = -100; x < 100; x += 1.5) {
      batch.box([0.03, 0.005, sidewalkWidth - 0.1], 0xc4bcae, [x, 0.1, side * sidewalkCenter]);
    }
    // Dashed divider between the two lanes of one direction.
    for (let x = -100; x < 100; x += 6) {
      batch.box([3, 0.02, 0.15], 0xeeeee4, [x, 0.01, side * CITY.laneWidth]);
    }
    // Solid double centre line between the two directions.
    batch.box([200, 0.02, 0.12], 0xeeeee4, [0, 0.01, side * 0.12]);
  }
  // Painted parking bay around the B05.
  for (const x of [0.4, 5.6]) {
    batch.box([0.1, 0.015, 2.1], 0xffffff, [x, 0.01, CITY.parkingZ]);
  }
  batch.box([5.3, 0.015, 0.1], 0xffffff, [3, 0.01, CITY.parkingZ - 1.05]);
  return batch.build();
}

function createBuildingRow(side: 1 | -1): Group {
  const row = new Group();
  const batch = new GeometryBatch();
  const front = side * FACADE_Z;
  const outward = -side;
  let x = -60;
  let index = side === 1 ? 0 : 3;
  while (x < 70) {
    const reachesMigros = side === -1 && x < MIGROS.endX;
    if (reachesMigros && x >= MIGROS.startX) {
      // Past the Migros the far side opens onto the station square — no more houses.
      break;
    }
    const naturalWidth = 7 + ((index * 3) % 4);
    // The last house before the Migros is trimmed so the two don't overlap.
    const width = reachesMigros ? Math.min(naturalWidth, MIGROS.startX - x) : naturalWidth;
    const height = 9 + ((index * 5) % 7);
    const centerX = x + width / 2;
    const wallColor = BUILDING_COLORS[index % BUILDING_COLORS.length];
    batch.box([width, height, BUILDING_DEPTH], wallColor, [centerX, height / 2, side * (FACADE_Z + BUILDING_DEPTH / 2)]);
    addRoof(batch, centerX, width, height, side);
    addShopFront(batch, row, centerX, width, front, outward, index);
    addWindows(batch, x, width, height, front, outward, index);
    x += width;
    index++;
  }
  row.add(batch.build());
  return row;
}

/** Flat roof with a cornice, as along Zürcherstrasse. */
function addRoof(batch: GeometryBatch, centerX: number, width: number, height: number, side: number): void {
  const depthCenter = side * (FACADE_Z + BUILDING_DEPTH / 2);
  batch.box([width + 0.2, 0.35, BUILDING_DEPTH + 0.2], 0xc9c2b6, [centerX, height + 0.17, depthCenter]);
}

/** Wide, flat Migros store: orange band, big glazed front, sliding doors at `MIGROS.doorX`. */
function createMigros(): { root: Group; doors: [Mesh, Mesh] } {
  const root = new Group();
  const batch = new GeometryBatch();
  const width = MIGROS.endX - MIGROS.startX;
  const centerX = (MIGROS.startX + MIGROS.endX) / 2;
  const height = 7;
  const surface = MIGROS.facadeZ + 0.03;
  batch.box([width, height, BUILDING_DEPTH], 0xf2f0ec, [centerX, height / 2, MIGROS.facadeZ - BUILDING_DEPTH / 2]);
  batch.box([width + 0.2, 0.35, BUILDING_DEPTH + 0.2], 0xc9c2b6, [centerX, height + 0.17, MIGROS.facadeZ - BUILDING_DEPTH / 2]);
  batch.box([width, 0.9, 0.1], MIGROS_ORANGE, [centerX, 6.2, surface]);
  batch.box([width - 2, 0.7, 0.06], 0x41618a, [centerX, 5.1, surface]);
  batch.box([width - 2, 2.6, 0.06], 0x8fb8d8, [centerX, 1.5, surface]);
  for (let mullionX = MIGROS.startX + 1; mullionX <= MIGROS.endX - 1; mullionX += 2) {
    batch.box([0.08, 2.6, 0.1], 0x5a5a62, [mullionX, 1.5, surface + 0.02]);
  }
  // Dark doorway behind the sliding panels.
  batch.box([2.4, 2.5, 0.08], 0x2a3440, [MIGROS.doorX, 1.25, surface + 0.03]);
  batch.box([2.8, 0.25, 0.3], 0x5a5a62, [MIGROS.doorX, 2.65, surface + 0.12]);
  root.add(batch.build());

  const doorMaterial = toon(0xa8d0e8);
  const doors = [-1, 1].map((side) => {
    const door = box(1.2, 2.4, 0.05, doorMaterial);
    door.position.set(MIGROS.doorX + side * 0.6, 1.2, surface + 0.1);
    root.add(door);
    return door;
  }) as [Mesh, Mesh];

  const logo = createLabel('M', 1.4, 1.4, {
    width: 256,
    height: 256,
    font: 'bold 220px "Helvetica Neue", Arial, sans-serif',
    color: '#ff6600',
    background: '#ffffff',
  });
  logo.position.set(MIGROS.startX + 3, 4.1, surface + 0.05);
  const lettering = createLabel('MIGROS', 6, 1.1, {
    width: 1024,
    height: 192,
    font: 'bold 150px "Helvetica Neue", Arial, sans-serif',
    color: '#ff6600',
    background: '#ffffff',
  });
  lettering.position.set(centerX, 4.1, surface + 0.05);
  root.add(logo, lettering);
  return { root, doors };
}

/** Open, paved square between the Migros and the station, up to the railway bridge. */
function createStationSquare(): Group {
  const batch = new GeometryBatch();
  const startX = MIGROS.endX;
  const endX = RAILWAY.frontX;
  const nearZ = -FACADE_Z;
  const farZ = -40;
  batch.box([endX - startX, 0.2, nearZ - farZ], 0xe0d8c8, [(startX + endX) / 2, 0, (nearZ + farZ) / 2]);
  for (let x = startX + 1.5; x < endX; x += 1.5) {
    batch.box([0.03, 0.005, nearZ - farZ], 0xccc3b2, [x, 0.1, (nearZ + farZ) / 2]);
  }
  const square = batch.build();
  square.add(createTree(startX + 4, -12), createTree(startX + 8, -15));
  return square;
}

/** Winterthur main station building. Origin = centre of the front at ground level, facing +z. */
function createStation(): Group {
  const batch = new GeometryBatch();
  const width = STATION.endX - STATION.startX;
  const depth = 12;
  const height = 16.5;
  const front = 0.03;
  batch.box([width, height, depth], 0xe3d6b8, [0, height / 2, -depth / 2]);
  batch.box([width + 0.4, 0.6, depth + 0.4], 0xbfae8c, [0, height + 0.3, -depth / 2]);
  for (let column = -2; column <= 2; column++) {
    const x = column * 6;
    batch.box([2.8, 4.6, 0.06], 0x41618a, [x, 3.6, front]);
    batch.box([2.8, 3, 0.08], 0x41618a, [x, 9.4, front]);
    batch.box([3.2, 0.18, 0.1], 0xbfae8c, [x, 7.6, front + 0.02]);
  }
  const station = batch.build();

  const name = createLabel('WINTERTHUR', 14, 1.9, {
    width: 1024,
    height: 140,
    font: 'bold 100px "Helvetica Neue", Arial, sans-serif',
    color: '#1a1a22',
    background: '#e3d6b8',
  });
  name.position.set(0, 14.6, front + 0.05);

  const clock = new Group();
  const clockFace = cylinder(1.1, 1.1, 0.12, toon(0xffffff));
  clockFace.rotation.x = Math.PI / 2;
  const hourHand = box(0.6, 0.08, 0.06, toon(0x1a1a22));
  hourHand.position.set(-0.25, 0.08, 0.08);
  const minuteHand = box(0.08, 0.9, 0.06, toon(0x1a1a22));
  minuteHand.position.set(0, 0.4, 0.08);
  const secondHand = box(0.04, 0.9, 0.05, toon(0xd52b1e));
  secondHand.position.set(0.12, 0.35, 0.1);
  secondHand.rotation.z = -0.4;
  clock.add(clockFace, hourHand, minuteHand, secondHand);
  clock.position.set(11, 12.4, front + 0.1);
  station.add(name, clock);
  return station;
}

/** Railway bridge across the far end of the street; trains cross along z on `RAILWAY.trackX`. */
function createRailwayBridge(): Group {
  const batch = new GeometryBatch();
  const centerX = (RAILWAY.frontX + RAILWAY.backX) / 2;
  const depth = RAILWAY.backX - RAILWAY.frontX;
  const span = 300;
  const deckThickness = 0.8;
  batch.box([depth, deckThickness, span], 0x9a958c, [centerX, RAILWAY.deckY - deckThickness / 2, 0]);
  // Abutments either side of the underpass; the street runs through between them.
  const underpassHalfWidth = FACADE_Z + 0.5;
  for (const side of [-1, 1]) {
    const wallLength = span / 2 - underpassHalfWidth;
    const wallZ = side * (underpassHalfWidth + wallLength / 2);
    batch.box([depth, RAILWAY.deckY - deckThickness, wallLength], 0xb0aa9e, [centerX, (RAILWAY.deckY - deckThickness) / 2, wallZ]);
  }
  for (const parapetX of [RAILWAY.frontX + 0.15, RAILWAY.backX - 0.15]) {
    batch.box([0.3, 0.9, span], 0x8a857c, [parapetX, RAILWAY.deckY + 0.45, 0]);
  }
  for (const trackX of RAILWAY.trackX) {
    batch.box([3, 0.15, span], 0x7a6e60, [trackX, RAILWAY.deckY + 0.07, 0]);
    for (const railOffset of [-0.72, 0.72]) {
      batch.box([0.08, 0.12, span], 0x5a5a62, [trackX + railOffset, RAILWAY.deckY + 0.2, 0]);
    }
    batch.box([0.03, 0.03, span], 0x2a2a30, [trackX, RAILWAY.deckY + 5.6, 0]);
  }
  // Catenary masts with a cross arm over both tracks.
  for (let z = -140; z <= 140; z += 20) {
    batch.box([0.25, 6.4, 0.25], 0x6a6a70, [RAILWAY.frontX + 0.6, RAILWAY.deckY + 3.2, z]);
    batch.box([depth - 1.2, 0.15, 0.15], 0x6a6a70, [centerX, RAILWAY.deckY + 5.8, z]);
  }
  return batch.build();
}

function addShopFront(
  batch: GeometryBatch,
  row: Group,
  centerX: number,
  width: number,
  front: number,
  outward: number,
  index: number,
): void {
  const surface = front + outward * 0.03;
  batch.box([width * 0.55, 1.9, 0.06], 0x8fb8d8, [centerX - width * 0.12, 1.35, surface]);
  batch.box([width * 0.55 + 0.16, 0.1, 0.1], 0xffffff, [centerX - width * 0.12, 0.38, surface]);
  batch.box([1, 2.2, 0.06], 0x6b4a33, [centerX + width * 0.3, 1.1, surface]);

  const [stripeA, stripeB] = AWNING_COLORS[index % AWNING_COLORS.length];
  const awningWidth = width * 0.62;
  const stripes = 8;
  const tilt = new Euler(outward * 0.45, 0, 0);
  for (let stripe = 0; stripe < stripes; stripe++) {
    const stripeX = centerX - width * 0.12 - awningWidth / 2 + (stripe + 0.5) * (awningWidth / stripes);
    batch.box(
      [awningWidth / stripes, 0.04, 1.1],
      stripe % 2 === 0 ? stripeA : stripeB,
      [stripeX, 2.62, front + outward * 0.5],
      tilt,
    );
  }

  const sign = createSign(SHOP_NAMES[index % SHOP_NAMES.length], Math.min(width - 1, 5.5));
  sign.position.set(centerX, 3.3, front + outward * 0.04);
  sign.rotation.y = outward > 0 ? 0 : Math.PI;
  row.add(sign);
}

function addWindows(
  batch: GeometryBatch,
  x: number,
  width: number,
  height: number,
  front: number,
  outward: number,
  index: number,
): void {
  const columns = Math.floor(width / 2.3);
  const hasShutters = index % 3 !== 1;
  const hasBalcony = index % 3 === 1;
  const shutterColor = SHUTTER_COLORS[index % SHUTTER_COLORS.length];
  for (let floor = 1; floor * FLOOR_HEIGHT + 2.6 < height; floor++) {
    const windowY = floor * FLOOR_HEIGHT + 1.6;
    for (let column = 0; column < columns; column++) {
      const windowX = x + 1.4 + column * 2.3;
      const isLit = (floor * 7 + column * 3 + index) % 5 === 0;
      batch.box([1.2, 1.6, 0.05], 0xffffff, [windowX, windowY, front + outward * 0.02]);
      batch.box([1, 1.4, 0.06], isLit ? 0xffe9a8 : 0x41618a, [windowX, windowY, front + outward * 0.03]);
      batch.box([1.4, 0.08, 0.25], 0xe9e2d6, [windowX, windowY - 0.84, front + outward * 0.12]);
      if (isLit) {
        batch.box([0.3, 1.3, 0.02], 0xf29bb5, [windowX - 0.33, windowY, front + outward * 0.07]);
      }
      if (hasShutters) {
        for (const shutterSide of [-1, 1]) {
          batch.box([0.42, 1.55, 0.06], shutterColor, [windowX + shutterSide * 0.84, windowY, front + outward * 0.05]);
        }
      }
    }
    if (hasBalcony && floor % 2 === 1) {
      const balconyWidth = width * 0.6;
      const balconyCenter = x + width / 2;
      batch.box([balconyWidth, 0.12, 1], 0xe9e2d6, [balconyCenter, windowY - 0.9, front + outward * 0.5]);
      batch.box([balconyWidth, 0.06, 0.06], 0x3a3a40, [balconyCenter, windowY + 0.05, front + outward * 0.97]);
      for (let bar = 0; bar <= 8; bar++) {
        const barX = balconyCenter - balconyWidth / 2 + (bar * balconyWidth) / 8;
        batch.box([0.04, 0.9, 0.04], 0x3a3a40, [barX, windowY - 0.4, front + outward * 0.97]);
      }
      batch.box([0.5, 0.35, 0.3], 0xb5473a, [balconyCenter + balconyWidth * 0.3, windowY - 0.67, front + outward * 0.8]);
      batch.box([0.55, 0.25, 0.35], 0x6cc070, [balconyCenter + balconyWidth * 0.3, windowY - 0.4, front + outward * 0.8]);
    }
  }
}

function createSign(text: string, width: number): Mesh {
  return createLabel(text, width, 0.65, {
    width: 1024,
    height: 128,
    font: 'bold 60px "Helvetica Neue", Arial, sans-serif',
    color: '#2a2a30',
    background: '#f4efe4',
  });
}

/** Flat, unlit text plane facing +z. */
function createLabel(text: string, width: number, height: number, style: Parameters<typeof textTexture>[1]): Mesh {
  const label = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: textTexture(text, style) }));
  label.material.userData.outlineParameters = { visible: false };
  return label;
}

function createTree(x: number, z: number): Group {
  const tree = new Group();
  const trunk = cylinder(0.15, 0.2, 2.2, toon(0x8a5a3c));
  trunk.position.y = 1.1;
  const crownMaterial = toon(0x6cc070);
  const crown = sphere(1.3, crownMaterial);
  crown.position.y = 3;
  const crownSide = sphere(0.9, crownMaterial);
  crownSide.position.set(0.7, 2.6, 0.2);
  const crownBack = sphere(0.8, toon(0x5aaa60));
  crownBack.position.set(-0.6, 3.4, -0.3);
  const grate = box(1.2, 0.03, 1.2, toon(0x4a4a50));
  grate.position.y = 0.11;
  tree.add(trunk, crown, crownSide, crownBack, grate);
  tree.position.set(x, 0, z);
  return tree;
}

function createLampPost(): Group {
  const lamp = new Group();
  const metal = toon(0x3e5c56);
  const pole = cylinder(0.07, 0.09, 4.2, metal);
  pole.position.y = 2.1;
  const base = cylinder(0.14, 0.16, 0.4, metal);
  base.position.y = 0.2;
  const arm = box(0.9, 0.07, 0.07, metal);
  arm.position.set(0.4, 4.15, 0);
  const head = box(0.45, 0.18, 0.3, toon(0xfff3b0));
  head.position.set(0.8, 4.05, 0);
  lamp.add(pole, base, arm, head);
  return lamp;
}

/** Ginger cat on a windowsill, unimpressed by everything. Faces +z (towards the street). */
function createWindowCat(): { root: Group; tail: Group } {
  const root = new Group();
  const fur = toon(0xf0a040);
  const body = sphere(0.18, fur);
  body.scale.set(1, 1.1, 0.9);
  body.position.y = 0.18;
  const head = sphere(0.13, fur);
  head.position.set(0, 0.43, 0.04);
  root.add(body, head);
  for (const side of [-1, 1]) {
    const ear = cylinder(0, 0.05, 0.1, fur);
    ear.position.set(side * 0.07, 0.56, 0.04);
    const eye = box(0.05, 0.012, 0.01, toon(0x1a1a22));
    eye.position.set(side * 0.05, 0.45, 0.165);
    root.add(ear, eye);
  }
  const tail = new Group();
  tail.position.set(0.12, 0.08, -0.05);
  const tailMesh = cylinder(0.025, 0.03, 0.4, fur);
  tailMesh.position.y = -0.2;
  tail.add(tailMesh);
  root.add(tail);
  return { root, tail };
}

function createCloud(): Group {
  const cloud = new Group();
  const material = toon(0xffffff);
  [
    [0, 0, 2.2],
    [2, -0.4, 1.6],
    [-2.1, -0.5, 1.5],
    [0.8, 1, 1.4],
  ].forEach(([x, y, radius]) => {
    const puff = sphere(radius, material);
    puff.castShadow = false;
    puff.position.set(x, y, 0);
    cloud.add(puff);
  });
  return cloud;
}
