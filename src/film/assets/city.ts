import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Scene,
} from 'three';
import { box, cylinder, sphere, textTexture, toon } from '../engine/build';

/** Street runs along x. Road z ∈ [-3.5, 3.5], sidewalks out to |z| = 7.5, buildings beyond. */
export const CITY = {
  sidewalkZ: 5.3,
  curbZ: 3.5,
  farLaneZ: -1.75,
  parkingZ: 2.4,
} as const;

export const LAMP_POST_X = -5;

const BUILDING_COLORS = [0xf6c6a8, 0xa8d8c8, 0xf3e3a1, 0xc9b8e8, 0xf2a9a0, 0xb5d3f0];

export interface City {
  root: Group;
  lampPost: Group;
  clouds: Group[];
}

export function createCity(scene: Scene): City {
  scene.background = new Color(0x9fd8ff);
  scene.fog = new Fog(0x9fd8ff, 45, 140);
  scene.add(new HemisphereLight(0xdff3ff, 0x8a7a60, 1.2));
  scene.add(new AmbientLight(0xffffff, 0.35));
  const sun = new DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(20, 30, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  scene.add(sun);

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
  root.add(createBakerySign());

  const clouds = [-30, -5, 20, 40].map((x, index) => {
    const cloud = createCloud();
    cloud.position.set(x, 26 + (index % 2) * 4, -30 - index * 6);
    root.add(cloud);
    return cloud;
  });

  scene.add(root);
  return { root, lampPost, clouds };
}

function createGround(): Group {
  const ground = new Group();
  const road = box(200, 0.1, 7, toon(0x5b6070));
  road.position.y = -0.05;
  ground.add(road);
  for (const side of [1, -1]) {
    const sidewalk = box(200, 0.2, 4, toon(0xd9d2c5));
    sidewalk.position.set(0, 0, side * 5.5);
    ground.add(sidewalk);
    const curb = box(200, 0.22, 0.2, toon(0xb9b2a5));
    curb.position.set(0, 0, side * 3.55);
    ground.add(curb);
  }
  const stripeMaterial = toon(0xffffff);
  for (let x = -100; x < 100; x += 6) {
    const stripe = box(3, 0.02, 0.18, stripeMaterial);
    stripe.position.set(x, 0.01, 0);
    ground.add(stripe);
  }
  return ground;
}

function createBuildingRow(side: 1 | -1): Group {
  const row = new Group();
  const windowMaterial = toon(0x41618a);
  const frameMaterial = toon(0xffffff);
  let x = -60;
  let colorIndex = side === 1 ? 0 : 3;
  while (x < 70) {
    const width = 7 + ((colorIndex * 3) % 4);
    const height = 9 + ((colorIndex * 5) % 7);
    const building = box(width, height, 8, toon(BUILDING_COLORS[colorIndex % BUILDING_COLORS.length]));
    building.position.set(x + width / 2, height / 2, side * 11.5);
    row.add(building);
    for (let floor = 1; floor * 3 < height - 1; floor++) {
      for (let column = 0; column < Math.floor(width / 2.3); column++) {
        const windowX = x + 1.4 + column * 2.3;
        const frame = box(1.2, 1.6, 0.05, frameMaterial);
        frame.position.set(windowX, floor * 3, side * 7.48);
        const pane = box(1, 1.4, 0.06, windowMaterial);
        pane.position.set(windowX, floor * 3, side * 7.47);
        row.add(frame, pane);
      }
    }
    x += width;
    colorIndex++;
  }
  return row;
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
  tree.add(trunk, crown, crownSide);
  tree.position.set(x, 0, z);
  return tree;
}

function createLampPost(): Group {
  const lamp = new Group();
  const metal = toon(0x3e5c56);
  const pole = cylinder(0.07, 0.09, 4.2, metal);
  pole.position.y = 2.1;
  const arm = box(0.9, 0.07, 0.07, metal);
  arm.position.set(0.4, 4.15, 0);
  const head = box(0.45, 0.18, 0.3, toon(0xfff3b0));
  head.position.set(0.8, 4.05, 0);
  lamp.add(pole, arm, head);
  return lamp;
}

/** A bakery whose sign doesn't quite know its own name. */
function createBakerySign(): Mesh {
  const texture = textTexture('BÄCKEREI BRÖTLI & SÖHNLI', {
    width: 1024,
    height: 128,
    font: 'bold 64px "Comic Sans MS", "Chalkboard SE", sans-serif',
    color: '#5a2d0c',
    background: '#ffe8b8',
  });
  const sign = new Mesh(new PlaneGeometry(7, 0.9), new MeshBasicMaterial({ map: texture }));
  sign.material.userData.outlineParameters = { visible: false };
  sign.position.set(9, 3.4, 7.46);
  sign.rotation.y = Math.PI;
  return sign;
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
