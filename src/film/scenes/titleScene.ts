import { Vector3 } from 'three';
import { createSparkle } from '../assets/b05';
import { createCity } from '../assets/city';
import { createHome, HOME, HOME_SPOTS } from '../assets/home';
import { setOutlineThickness, sphere, toon } from '../engine/build';
import type { Stage } from '../engine/stage';
import { ease, Timeline } from '../engine/timeline';

/** Long enough that nobody waits that long on the title screen; the loops simply stop then. */
const TITLE_LOOP_SECONDS = 3600;
const OUTLINE_BACKGROUND = 0.0022;

/** From the living room towards the kitchen counter: barista machine and the hot cup in the middle. */
const CAMERA_POSITION = new Vector3(-62.9, HOME.flatFloorY + 1.6, 16.3);
const CAMERA_TARGET = new Vector3(-60.7, HOME.flatFloorY + 1.05, 13.9);
const CAMERA_FOV = 55;

const STEAM_PUFFS = 9;
const STEAM_RISE = 0.35;
const STEAM_SECONDS = 2.4;

/**
 * Title still: Alain alone at home — his generous kitchen, the barista machine and a hot
 * coffee steaming on the worktop. The clock ticks, the machine gleams.
 */
export function buildTitleScene(stage: Stage): Timeline {
  const { scene, camera } = stage;
  const timeline = new Timeline();
  const city = createCity(scene);
  setOutlineThickness(city.root, OUTLINE_BACKGROUND);
  const home = createHome();
  scene.add(home.root);

  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);
  camera.fov = CAMERA_FOV;
  camera.updateProjectionMatrix();

  const steam = Array.from({ length: STEAM_PUFFS }, () => {
    const material = toon(0xffffff);
    material.transparent = true;
    material.userData.outlineParameters = { visible: false };
    const puff = sphere(0.025, material);
    puff.castShadow = false;
    scene.add(puff);
    return { puff, material };
  });

  const gleam = createSparkle();
  gleam.position.copy(HOME_SPOTS.barista).add(new Vector3(-0.23, 0.12, 0.2));
  scene.add(gleam);

  timeline.tween(0, TITLE_LOOP_SECONDS, (_progress, elapsed) => {
    steam.forEach(({ puff, material }, index) => {
      const phase = (elapsed / STEAM_SECONDS + index / STEAM_PUFFS) % 1;
      puff.position.set(
        HOME_SPOTS.coffeeCup.x + Math.sin(phase * 9 + index) * 0.02,
        HOME_SPOTS.coffeeCup.y + phase * STEAM_RISE,
        HOME_SPOTS.coffeeCup.z + Math.cos(phase * 7 + index) * 0.015,
      );
      puff.scale.setScalar(0.6 + phase * 1.6);
      material.opacity = Math.sin(phase * Math.PI) * 0.7;
    });
    home.clockHand.rotation.z = -Math.floor(elapsed) * ((Math.PI * 2) / 60);
    home.flag.rotation.x = Math.sin(elapsed * 0.6) * 0.02;
    gleam.scale.setScalar(Math.max(0, Math.sin(elapsed * 1.3)) ** 12 * 0.35);
  }, ease.linear);

  return timeline;
}
