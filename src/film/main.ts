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
  let isPaused = false;
  let isSeeking = false;

  const play = (presetAnswers: readonly number[] = []) => {
    try {
      titleTimeline = undefined;
      story?.stop();
      sounds?.close();
      choices.clear();
      callouts.clear();
      stage.reset();
      sounds = new SoundBoard();
      sounds.setPaused(isPaused);
      const currentStory = new Story(choices.present, presetAnswers);
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

  const debugTime = requireElement('debug-time');
  stage.onFrame((deltaSeconds) => {
    if (isPaused || isSeeking) {
      return;
    }
    titleTimeline?.advance(deltaSeconds);
    story?.advance(deltaSeconds);
    callouts.update(deltaSeconds);
    debugTime.textContent = `${(story?.filmTime ?? 0).toFixed(1)} s`;
  });

  requireElement('play').addEventListener('click', () => play());
  requireElement('replay').addEventListener('click', () => play());

  // Debug controls: space pauses, "Springe zu" seeks in film time.
  {
    const debugForm = requireElement('debug') as HTMLFormElement;
    const seekInput = requireElement('debug-seek') as HTMLInputElement;
    debugForm.hidden = false;

    const isPauseKey = (event: KeyboardEvent) => event.code === 'Space' && !(event.target instanceof HTMLInputElement);
    window.addEventListener('keydown', (event) => {
      if (!isPauseKey(event)) {
        return;
      }
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      isPaused = !isPaused;
      sounds?.setPaused(isPaused);
      debugTime.classList.toggle('film__debug-time--paused', isPaused);
    });
    // A focused button (Start, an answer, "Los") would otherwise "click" on space release.
    window.addEventListener('keyup', (event) => {
      if (isPauseKey(event)) {
        event.preventDefault();
      }
    });

    debugForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const targetSeconds = seekInput.valueAsNumber;
      if (isSeeking || Number.isNaN(targetSeconds)) {
        return;
      }
      // Timelines only run forward: seeking back replays from the start with the same answers.
      if (!story || targetSeconds < story.filmTime) {
        play(story?.answers ?? []);
      }
      const seekingStory = story;
      const seekingSounds = sounds;
      if (!seekingStory || !seekingSounds) {
        return;
      }
      isSeeking = true;
      seekingSounds.setMuted(true);
      seekingStory
        .fastForwardTo(targetSeconds, 1 / 30, (deltaSeconds) => callouts.update(deltaSeconds))
        .then(
          () => {
            debugTime.textContent = `${seekingStory.filmTime.toFixed(1)} s`;
          },
          (error: unknown) => showError('Springen fehlgeschlagen', error),
        )
        .finally(() => {
          seekingSounds.setMuted(false);
          isSeeking = false;
        });
    });
  }
} catch (error) {
  showError('3D-Bühne konnte nicht initialisiert werden (WebGL?)', error);
}
