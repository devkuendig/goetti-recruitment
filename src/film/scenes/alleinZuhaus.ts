import type { Story } from '../engine/story';
import {
  bananaLife,
  BANANA_OPTIONS,
  BANANA_QUESTION,
  BANANA_REACTIONS,
  collectBananas,
  createBananaCast,
  createCrossingCast,
  createCyclistCast,
  CROSSING_OPTIONS,
  CROSSING_QUESTION,
  CROSSING_REACTIONS,
  crossingIdle,
  driveToBananas,
  driveToCrossing,
} from './driveScenes';
import {
  calmDown,
  createFamilyCast,
  familyLife,
  cryingIdle,
  GOETTI_ANSWER,
  GOETTI_OPTIONS,
  GOETTI_QUESTION,
  goettiIdle,
  maybeEnding,
  noReaction,
  parkAndMeetFamily,
  SURE_OPTIONS,
  SURE_QUESTION,
  yesEnding,
} from './goettiScenes';
import {
  ACTIVITY_OPTIONS,
  ACTIVITY_QUESTION,
  ACTIVITY_REACTIONS,
  apartmentIdle,
  apartmentMorning,
  garageReveal,
  grabKey,
} from './homeScenes';
import { buildAmbience, type World } from './world';

const ENDING_TITLES = {
  yes: 'Wir freuen uns riesig, Götti Alain! 💛',
  maybe: 'Bedenkzeit bis morgen … 😎',
} as const;

/**
 * "Alain alain Zuhaus" — the whole interactive film as one script.
 * Every cast is built up front so no beat stutters while geometry is created.
 * Resolves with the title of the end card the viewer earned.
 */
export async function playAlleinZuhaus(story: Story, world: World): Promise<string> {
  const crossing = createCrossingCast(world);
  const cyclists = createCyclistCast(world);
  const bananas = createBananaCast(world);
  const family = createFamilyCast(world);
  story.loop(buildAmbience(world));
  story.loop(bananaLife(bananas));
  story.loop(familyLife(family));

  // ── At home ───────────────────────────────────────────────────────────────
  await story.play(apartmentMorning(world));
  const activity = await story.ask(ACTIVITY_QUESTION, ACTIVITY_OPTIONS, apartmentIdle(world));
  await story.play(ACTIVITY_REACTIONS[activity](world));
  await story.play(grabKey(world));
  await story.play(garageReveal(world));

  // ── On Zürcherstrasse ─────────────────────────────────────────────────────
  await story.play(driveToCrossing(world, crossing, cyclists));
  const crossingChoice = await story.ask(CROSSING_QUESTION, CROSSING_OPTIONS, crossingIdle(crossing));
  await story.play(CROSSING_REACTIONS[crossingChoice](world, crossing));
  await story.play(driveToBananas(world, crossing, bananas));
  const bananaChoice = await story.ask(BANANA_QUESTION, BANANA_OPTIONS);
  await story.play(BANANA_REACTIONS[bananaChoice](world, bananas));
  await story.play(collectBananas(world, bananas));

  // ── The godchild ──────────────────────────────────────────────────────────
  await story.play(parkAndMeetFamily(world, family));
  for (;;) {
    const answer = await story.ask(GOETTI_QUESTION, GOETTI_OPTIONS, goettiIdle(world, family));
    if (answer === GOETTI_ANSWER.yes) {
      await story.play(yesEnding(world, family));
      return ENDING_TITLES.yes;
    }
    if (answer === GOETTI_ANSWER.maybe) {
      await story.play(maybeEnding(world, family));
      return ENDING_TITLES.maybe;
    }
    await story.play(noReaction(world, family));
    await story.ask(SURE_QUESTION, SURE_OPTIONS, cryingIdle(world, family));
    await story.play(calmDown(world, family));
  }
}
