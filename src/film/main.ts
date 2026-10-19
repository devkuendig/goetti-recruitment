import { SoundBoard } from './engine/audio';
import { Callouts } from './engine/callouts';
import { Stage } from './engine/stage';
import type { Timeline } from './engine/timeline';
import { buildScene01, SCENE01_DURATION_SECONDS } from './scenes/scene01Challenge';

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`film.html is missing #${id}`);
  }
  return element;
}

const stageHost = requireElement('stage');
const titleCard = requireElement('title-card');
const endCard = requireElement('end-card');
const errorBox = requireElement('error');

function showError(message: string, error: unknown): void {
  errorBox.textContent = `${message}: ${error instanceof Error ? error.message : String(error)}`;
  errorBox.hidden = false;
}

try {
  const stage = new Stage(stageHost);
  const callouts = new Callouts(requireElement('callouts'), stage.camera);
  let timeline: Timeline | undefined;
  let sounds: SoundBoard | undefined;

  const play = () => {
    try {
      sounds?.close();
      callouts.clear();
      stage.reset();
      sounds = new SoundBoard();
      timeline = buildScene01(stage, sounds, callouts);
      titleCard.hidden = true;
      endCard.hidden = true;
    } catch (error) {
      showError('Szene konnte nicht gestartet werden', error);
    }
  };

  stage.onFrame((deltaSeconds) => {
    if (!timeline) {
      return;
    }
    timeline.advance(deltaSeconds);
    callouts.update(deltaSeconds);
    if (timeline.time >= SCENE01_DURATION_SECONDS) {
      endCard.hidden = false;
    }
  });

  requireElement('play').addEventListener('click', play);
  requireElement('replay').addEventListener('click', play);
} catch (error) {
  showError('3D-Bühne konnte nicht initialisiert werden (WebGL?)', error);
}
