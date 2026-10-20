import { describe, expect, it } from 'vitest';
import { Story, type PresentChoice } from './story';
import { Timeline } from './timeline';

/** Lets pending promise callbacks run, like the browser does between two frames. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function choiceAnsweredWith(index: number): { present: PresentChoice; answer: () => void } {
  let resolvePick: ((picked: number) => void) | undefined;
  return {
    present: () =>
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    answer: () => resolvePick?.(index),
  };
}

describe('Story', () => {
  it('whenClipNotYetAtItsEnd_thenPlayStaysPending', async () => {
    const story = new Story(() => Promise.resolve(0));
    let finished = false;
    void story.play(new Timeline().tween(0, 2, () => undefined)).then(() => {
      finished = true;
    });

    story.advance(1.5);
    await flush();

    expect(finished).toBe(false);
  });

  it('whenClipReachesItsEnd_thenPlayResolves', async () => {
    const story = new Story(() => Promise.resolve(0));
    let finished = false;
    void story.play(new Timeline().tween(0, 2, () => undefined)).then(() => {
      finished = true;
    });

    story.advance(1.5);
    story.advance(0.6);
    await flush();

    expect(finished).toBe(true);
  });

  it('whenAsking_thenIdleTimelineRunsUntilViewerPicks', async () => {
    const choice = choiceAnsweredWith(2);
    const story = new Story(choice.present);
    let idleSeconds = 0;
    const idle = new Timeline().tween(0, 1, (_progress, elapsed) => {
      idleSeconds = elapsed;
    });

    const picked = story.ask('Was tun?', [], idle);
    story.advance(5);
    choice.answer();

    expect(await picked).toBe(2);
    expect(idleSeconds).toBe(5);
  });

  it('whenAdvancing_thenLoopsRunAlongsideTheClip', () => {
    const story = new Story(() => Promise.resolve(0));
    let loopSeconds = 0;
    story.loop(new Timeline().tween(0, 100, (_progress, elapsed) => {
      loopSeconds = elapsed;
    }));

    story.advance(0.5);
    story.advance(0.5);

    expect(loopSeconds).toBe(1);
  });

  it('whenWaitingOnQuestion_thenFilmTimeOnlyCountsPlayedBeats', async () => {
    const choice = choiceAnsweredWith(0);
    const story = new Story(choice.present);
    void story.play(new Timeline().tween(0, 2, () => undefined));

    story.advance(2);
    const picked = story.ask('Was tun?', [], new Timeline());
    story.advance(10);
    choice.answer();
    await picked;

    expect(story.filmTime).toBe(2);
  });

  it('whenPresetAnswersGiven_thenAskAnswersWithoutPresenting', async () => {
    let presented = 0;
    const story = new Story(() => {
      presented++;
      return Promise.resolve(0);
    }, [2]);

    const first = await story.ask('Erste?', []);
    const second = await story.ask('Zweite?', []);

    expect([first, second]).toEqual([2, 0]);
    expect(presented).toBe(1);
    expect(story.answers).toEqual([2, 0]);
  });

  it('whenFastForwarding_thenPlaysThroughBeatsUpToTarget', async () => {
    const story = new Story(() => Promise.resolve(0));
    let secondBeatSeconds = 0;
    const script = async () => {
      await story.play(new Timeline().tween(0, 1, () => undefined));
      await story.play(new Timeline().tween(0, 3, (_progress, elapsed) => {
        secondBeatSeconds = elapsed;
      }));
    };
    void script();

    await story.fastForwardTo(2.5, 0.25, () => undefined);

    expect(story.filmTime).toBeCloseTo(2.5);
    expect(secondBeatSeconds).toBeCloseTo(1.5);
  });

  it('whenFastForwardReachesOpenQuestion_thenStopsBeforeTarget', async () => {
    const story = new Story(() => new Promise<number>(() => undefined));
    const script = async () => {
      await story.play(new Timeline().tween(0, 1, () => undefined));
      await story.ask('Was tun?', [], new Timeline());
    };
    void script();

    await story.fastForwardTo(10, 0.25, () => undefined);

    expect(story.filmTime).toBeCloseTo(1);
  });

  it('whenStopped_thenNothingAdvancesAndPlayNeverResolves', async () => {
    const story = new Story(() => Promise.resolve(0));
    let finished = false;
    let loopSeconds = 0;
    story.loop(new Timeline().tween(0, 100, (_progress, elapsed) => {
      loopSeconds = elapsed;
    }));
    void story.play(new Timeline().tween(0, 1, () => undefined)).then(() => {
      finished = true;
    });

    story.stop();
    story.advance(5);
    await flush();

    expect(finished).toBe(false);
    expect(loopSeconds).toBe(0);
  });
});
