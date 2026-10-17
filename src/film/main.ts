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

const filmHost = requireElement('film');
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
      (error: unknown) => showError('D Filmlängi het nöd chöne gmässe wärde', error),
    );
  };

  const debugTime = requireElement('debug-time');
  const togglePause = () => {
    isPaused = !isPaused;
    sounds?.setPaused(isPaused);
    debugTime.classList.toggle('film__debug-time--paused', isPaused);
    filmHost.classList.toggle('film--paused', isPaused);
  };

  // One tap/click on the picture pauses or resumes the running film (not the title still).
  stageHost.addEventListener('click', () => {
    if (story) {
      togglePause();
    }
  });

  /**
   * On smartphones the film plays fullscreen in landscape. Must run inside the Start/Replay click
   * (user gesture). Browsers without element fullscreen (iPhone Safari) keep the normal page view.
   */
  const enterMobileFullscreen = () => {
    if (isDesktop || !document.fullscreenEnabled || document.fullscreenElement) {
      return;
    }
    filmHost
      .requestFullscreen({ navigationUI: 'hide' })
      .then(() => {
        // `lock` is missing from some TS DOM libs and from iOS; only Android browsers support it.
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: 'landscape') => Promise<void>;
        };
        return orientation.lock?.('landscape');
      })
      .catch((error: unknown) => showError('Vollbild/Querformat het nöd chöne aktiviert wärde', error));
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
        (error: unknown) => showError('De Film isch abbroche', error),
      );
    } catch (error) {
      showError('De Film het nöd chöne gstartet wärde', error);
    }
  };

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

  const startFromButton = () => {
    enterMobileFullscreen();
    if (isPaused) {
      togglePause();
    }
    play();
  };
  requireElement('play').addEventListener('click', startFromButton);
  requireElement('replay').addEventListener('click', startFromButton);

  // Debug controls (desktop only, hidden until Shift is pressed 4 times within 2 s; again hides them):
  // space pauses, the slider seeks in film time.
  if (isDesktop) {
    const debugForm = requireElement('debug') as HTMLFormElement;
    const DEBUG_TOGGLE_PRESSES = 4;
    const DEBUG_TOGGLE_WINDOW_MS = 2000;
    let shiftPressTimes: number[] = [];
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Shift' || event.repeat) {
        return;
      }
      const now = event.timeStamp;
      shiftPressTimes = [...shiftPressTimes, now].filter((time) => now - time <= DEBUG_TOGGLE_WINDOW_MS);
      if (shiftPressTimes.length >= DEBUG_TOGGLE_PRESSES) {
        shiftPressTimes = [];
        debugForm.hidden = !debugForm.hidden;
      }
    });

    const isPauseKey = (event: KeyboardEvent) =>
      !debugForm.hidden && event.code === 'Space' && !(event.target instanceof HTMLInputElement);
    window.addEventListener('keydown', (event) => {
      if (!isPauseKey(event)) {
        return;
      }
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      togglePause();
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
          (error: unknown) => showError('Springe isch fählgschlage', error),
        )
        .finally(() => {
          seekingSounds.setMuted(false);
          isSeeking = false;
        });
    });
  }
} catch (error) {
  showError('D 3D-Bühni het nöd chöne initialisiert wärde (WebGL?)', error);
}
