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
import { box, cylinder, GeometryBatch, profileBody, sphere, textTexture, toon } from '../engine/build';
import { createSparkle } from './b05';

/** Street runs along x. Road z ∈ [-3.5, 3.5], sidewalks out to |z| = 7.5, buildings beyond. */
export const CITY = {
  sidewalkZ: 5.3,
  curbZ: 3.5,
  farLaneZ: -1.75,
  parkingZ: 2.4,
} as const;

export const LAMP_POST_X = -5;

const FACADE_Z = 7.5;
const BUILDING_DEPTH = 8;
const FLOOR_HEIGHT = 3;
const SKY_HORIZON = new Color(0xe6f5ff);
const SKY_ZENITH = new Color(0x56aef0);
const SUN_DIRECTION = new Vector3(20, 30, 15).normalize();

const BUILDING_COLORS = [0xf6c6a8, 0xa8d8c8, 0xf3e3a1, 0xc9b8e8, 0xf2a9a0, 0xb5d3f0, 0xf7dcc0];
const SHUTTER_COLORS = [0x3f8a5a, 0x3a6ea5, 0xb5473a, 0x8a6a3a];
const AWNING_COLORS: [number, number][] = [
  [0xe2453b, 0xffffff],
  [0x2f7f5f, 0xfff4d6],
  [0x2f5fa5, 0xffffff],
  [0xf2a33a, 0x7a3b1c],
];
/** Shop names along the street — local flavour, a few puns. */
const SHOP_NAMES = [
  'BÄCKEREI BRÖTLI & SÖHNLI',
  'COIFFEUR HAARGENAU',
  'KEBAB WINTI',
  'CHÄSLADE',
  'VELO MÜLLER',
  'BLUEME BLÜEMLI',
  'KIOSK ZUM GLÜCK',
];

export interface City {
  root: Group;
  lampPost: Group;
  clouds: Group[];
  catTail: Group;
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
  for (const x of [-22, -10, 12, 24]) {
    root.add(createTree(x, 6.8));
    root.add(createTree(x + 5, -6.8));
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
  return { root, lampPost, clouds, catTail: cat.tail };
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
  batch.box([200, 0.1, 7], 0x5b6070, [0, -0.05, 0]);
  for (const side of [1, -1]) {
    batch.box([200, 0.2, 4], 0xd9d2c5, [0, 0, side * 5.5]);
    batch.box([200, 0.22, 0.2], 0xb9b2a5, [0, 0, side * 3.55]);
    // Paving joints so the sidewalk doesn't read as one flat slab.
    for (let x = -100; x < 100; x += 1.5) {
      batch.box([0.03, 0.005, 3.9], 0xc4bcae, [x, 0.1, side * 5.5]);
    }
  }
  for (let x = -100; x < 100; x += 6) {
    batch.box([3, 0.02, 0.18], 0xeeeee4, [x, 0.01, 0]);
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
    const width = 7 + ((index * 3) % 4);
    const height = 9 + ((index * 5) % 7);
    const centerX = x + width / 2;
    const wallColor = BUILDING_COLORS[index % BUILDING_COLORS.length];
    batch.box([width, height, BUILDING_DEPTH], wallColor, [centerX, height / 2, side * (FACADE_Z + BUILDING_DEPTH / 2)]);
    addRoof(batch, centerX, width, height, side, index);
    addShopFront(batch, row, centerX, width, front, outward, index);
    addWindows(batch, x, width, height, front, outward, index);
    x += width;
    index++;
  }
  row.add(batch.build());
  return row;
}

function addRoof(batch: GeometryBatch, centerX: number, width: number, height: number, side: number, index: number): void {
  const depthCenter = side * (FACADE_Z + BUILDING_DEPTH / 2);
  if (index % 2 === 0) {
    const halfDepth = BUILDING_DEPTH / 2 + 0.3;
    const roof = profileBody(
      [
        [-halfDepth, 0],
        [halfDepth, 0],
        [0, 2.6],
      ],
      width + 0.3,
      toon(0xffffff),
      0,
    );
    roof.geometry.rotateY(Math.PI / 2);
    roof.geometry.translate(centerX, height, depthCenter);
    batch.add(roof.geometry, index % 4 === 0 ? 0xc8553d : 0x5a6b7a);
    batch.box([0.5, 1.2, 0.5], 0xa04a3a, [centerX + width * 0.25, height + 1.8, depthCenter + side * 1.5]);
  } else {
    batch.box([width + 0.2, 0.35, BUILDING_DEPTH + 0.2], 0xe9e2d6, [centerX, height + 0.17, depthCenter]);
  }
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
  const texture = textTexture(text, {
    width: 1024,
    height: 128,
    font: 'bold 60px "Comic Sans MS", "Chalkboard SE", sans-serif',
    color: '#4a2a12',
    background: '#ffe8b8',
  });
  const sign = new Mesh(new PlaneGeometry(width, 0.65), new MeshBasicMaterial({ map: texture }));
  sign.material.userData.outlineParameters = { visible: false };
  return sign;
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
