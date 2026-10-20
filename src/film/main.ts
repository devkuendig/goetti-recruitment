import { PerspectiveCamera, Scene } from 'three';
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
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const seekInput = requireElement('debug-seek') as HTMLInputElement;
  /** Answers the slider's length was measured for; later questions were assumed at their first option. */
  let measuredAnswers: readonly number[] = [];
  const isMeasuredPath = (answers: readonly number[]) =>
    answers.length <= measuredAnswers.length && answers.every((answer, index) => answer === measuredAnswers[index]);
  /** Sets the slider's range to the film's played length (no question time) along `answers`. */
  const measureFilmLength = (answers: readonly number[], filmSounds: SoundBoard) => {
    measuredAnswers = [...answers];
    // A throwaway world on a bare scene: nothing of it is ever rendered or played.
    const dryStage = { scene: new Scene(), camera: new PerspectiveCamera() };
    Story.measure(answers, (dryStory) => playAlleinZuhaus(dryStory, createWorld(dryStage, filmSounds, callouts))).then(
      (seconds) => {
        seekInput.max = seconds.toFixed(1);
      },
      (error: unknown) => showError('Filmlänge konnte nicht gemessen werden', error),
    );
  };

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
      if (isDesktop) {
        measureFilmLength(presetAnswers, sounds);
      }
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
  const seekValue = requireElement('debug-seek-value');
  let isScrubbing = false;
  const showDebugTime = (filmTime: number) => {
    debugTime.textContent = `${filmTime.toFixed(1)} s`;
    if (!isScrubbing) {
      seekInput.value = filmTime.toFixed(1);
      seekValue.textContent = `${Math.round(filmTime)} s`;
    }
  };

  stage.onFrame((deltaSeconds) => {
    if (isPaused || isSeeking) {
      return;
    }
    titleTimeline?.advance(deltaSeconds);
    story?.advance(deltaSeconds);
    callouts.update(deltaSeconds);
    showDebugTime(story?.filmTime ?? 0);
    // The viewer took another branch than measured: the film's length may have changed.
    if (isDesktop && story && sounds && !isMeasuredPath(story.answers)) {
      measureFilmLength(story.answers, sounds);
    }
  });

  requireElement('play').addEventListener('click', () => play());
  requireElement('replay').addEventListener('click', () => play());

  // Debug controls (desktop only): space pauses, the slider seeks in film time.
  if (isDesktop) {
    const debugForm = requireElement('debug') as HTMLFormElement;
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

    debugForm.addEventListener('submit', (event) => event.preventDefault());
    seekInput.addEventListener('input', () => {
      isScrubbing = true;
      seekValue.textContent = `${Math.round(seekInput.valueAsNumber)} s`;
    });
    seekInput.addEventListener('change', () => {
      isScrubbing = false;
      // Hand focus back so space pauses again.
      seekInput.blur();
      const targetSeconds = seekInput.valueAsNumber;
      if (isSeeking) {
        return;
      }
      // Timelines only run forward: seeking back (or past an open question) replays from the start
      // with the answers given so far; questions beyond them get their first option.
      if (!story || targetSeconds < story.filmTime || story.isAsking) {
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
          () => showDebugTime(seekingStory.filmTime),
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
