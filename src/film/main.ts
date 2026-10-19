import { SoundBoard } from './engine/audio';
import { Callouts } from './engine/callouts';
import { ChoicePanel } from './engine/choices';
import { Stage } from './engine/stage';
import { Story } from './engine/story';
import type { Timeline } from './engine/timeline';
import { playAlleinZuhaus } from './scenes/alleinZuhaus';
import { buildTitleScene } from './scenes/titleScene';
import { createWorld } from './scenes/world';

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
const endTitle = requireElement('end-title');
const errorBox = requireElement('error');

function showError(message: string, error: unknown): void {
  errorBox.textContent = `${message}: ${error instanceof Error ? error.message : String(error)}`;
  errorBox.hidden = false;
}

try {
  const stage = new Stage(stageHost);
  const callouts = new Callouts(requireElement('callouts'), stage.camera);
  const choices = new ChoicePanel(requireElement('choice'));
  let titleTimeline: Timeline | undefined = buildTitleScene(stage);
  let story: Story | undefined;
  let sounds: SoundBoard | undefined;

  const play = () => {
    try {
      titleTimeline = undefined;
      story?.stop();
      sounds?.close();
      choices.clear();
      callouts.clear();
      stage.reset();
      sounds = new SoundBoard();
      const currentStory = new Story(choices.present);
      story = currentStory;
      const world = createWorld(stage, sounds, callouts);
      titleCard.hidden = true;
      endCard.hidden = true;
      playAlleinZuhaus(currentStory, world).then(
        (endingTitle) => {
          if (story === currentStory) {
            endTitle.textContent = endingTitle;
            endCard.hidden = false;
          }
        },
        (error: unknown) => showError('Film ist abgebrochen', error),
      );
    } catch (error) {
      showError('Film konnte nicht gestartet werden', error);
    }
  };

  stage.onFrame((deltaSeconds) => {
    titleTimeline?.advance(deltaSeconds);
    story?.advance(deltaSeconds);
    callouts.update(deltaSeconds);
  });

  requireElement('play').addEventListener('click', play);
  requireElement('replay').addEventListener('click', play);
} catch (error) {
  showError('3D-Bühne konnte nicht initialisiert werden (WebGL?)', error);
}
