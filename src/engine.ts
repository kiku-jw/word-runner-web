import { conceptById } from "./content";
import type {
  Concept,
  ContentPack,
  QuestionOrigin,
  RunQuestion,
  RunState,
  Side,
} from "./types";

const RUN_LENGTH = 10;

function randomId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    const swap = result[swapIndex];
    if (current === undefined || swap === undefined) {
      continue;
    }
    result[index] = swap;
    result[swapIndex] = current;
  }
  return result;
}

function chooseSide(
  previousSides: readonly Side[],
  random: () => number,
): Side {
  const lastThree = previousSides.slice(-3);
  if (lastThree.length === 3 && lastThree.every((side) => side === "left")) {
    return "right";
  }
  if (lastThree.length === 3 && lastThree.every((side) => side === "right")) {
    return "left";
  }
  return random() < 0.5 ? "left" : "right";
}

function limitFutureSideStreaks(
  questions: readonly RunQuestion[],
  firstMutableIndex: number,
): RunQuestion[] {
  const result = questions.map((question) => ({ ...question }));
  for (let index = firstMutableIndex; index < result.length; index += 1) {
    const question = result[index];
    const previousThree = result.slice(Math.max(0, index - 3), index);
    if (
      question &&
      previousThree.length === 3 &&
      previousThree.every(
        (previous) => previous.correctSide === question.correctSide,
      )
    ) {
      question.correctSide =
        question.correctSide === "left" ? "right" : "left";
    }
  }
  return result;
}

function chooseDistractor(
  concept: Concept,
  lessonConceptIds: readonly string[],
  random: () => number,
): string {
  const candidates = concept.distractorIds.filter((id) =>
    lessonConceptIds.includes(id),
  );
  const chosen = candidates[Math.floor(random() * candidates.length)];
  if (!chosen) {
    throw new Error(`No valid distractor for ${concept.id}`);
  }
  return chosen;
}

function questionFromConcept(
  pack: ContentPack,
  lessonConceptIds: readonly string[],
  conceptId: string,
  correctSide: Side,
  origin: QuestionOrigin,
  random: () => number,
  index: number,
  seed: number,
): RunQuestion {
  const concept = conceptById(pack, conceptId);
  return {
    id: `${seed}-${index}-${conceptId}-${origin}`,
    conceptId,
    distractorId: chooseDistractor(
      concept,
      lessonConceptIds,
      random,
    ),
    correctSide,
    selectedSide: null,
    origin,
  };
}

export function validateContentPack(pack: ContentPack): string[] {
  const errors: string[] = [];
  if (
    pack.schemaVersion !== 1 ||
    pack.sourceLocale !== "uk" ||
    pack.targetLocale !== "en"
  ) {
    errors.push("Unsupported content-pack schema or locale pair.");
  }

  const conceptIds = new Set<string>();
  for (const concept of pack.concepts) {
    if (
      !concept.id.trim() ||
      !concept.glyph.trim() ||
      !concept.category.trim() ||
      ![1, 2, 3].includes(concept.difficulty) ||
      (concept.reviewStatus !== "prototype" &&
        concept.reviewStatus !== "approved")
    ) {
      errors.push(`Concept ${concept.id || "(missing id)"} has invalid metadata.`);
    }
    if (conceptIds.has(concept.id)) {
      errors.push(`Duplicate concept id: ${concept.id}`);
    }
    conceptIds.add(concept.id);
    if (!concept.source.uk.trim() || !concept.target.en.trim()) {
      errors.push(`Concept ${concept.id} has an empty translation.`);
    }
    if (concept.distractorIds.includes(concept.id)) {
      errors.push(`Concept ${concept.id} references itself as a distractor.`);
    }
    if (new Set(concept.distractorIds).size !== concept.distractorIds.length) {
      errors.push(`Concept ${concept.id} has duplicate distractors.`);
    }
    if (concept.distractorIds.length === 0) {
      errors.push(`Concept ${concept.id} has no distractors.`);
    }
  }

  const lessonIds = new Set<string>();
  const usedConceptIds = new Set<string>();
  for (const lesson of pack.lessons) {
    if (
      !lesson.id.trim() ||
      !lesson.title.trim() ||
      !lesson.subtitle.trim() ||
      !lesson.glyph.trim()
    ) {
      errors.push(`Lesson ${lesson.id || "(missing id)"} has invalid metadata.`);
    }
    if (lessonIds.has(lesson.id)) {
      errors.push(`Duplicate lesson id: ${lesson.id}`);
    }
    lessonIds.add(lesson.id);
    if (lesson.conceptIds.length !== 6) {
      errors.push(`Lesson ${lesson.id} must contain six concepts.`);
    }
    if (new Set(lesson.conceptIds).size !== lesson.conceptIds.length) {
      errors.push(`Lesson ${lesson.id} contains duplicate concepts.`);
    }

    const targetWords = new Set<string>();
    for (const conceptId of lesson.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        errors.push(`Lesson ${lesson.id} references unknown ${conceptId}.`);
        continue;
      }
      if (usedConceptIds.has(conceptId)) {
        errors.push(`Concept ${conceptId} appears in multiple lessons.`);
      }
      usedConceptIds.add(conceptId);
      const concept = conceptById(pack, conceptId);
      const normalizedTarget = concept.target.en.trim().toLocaleLowerCase("en");
      if (targetWords.has(normalizedTarget)) {
        errors.push(`Lesson ${lesson.id} has duplicate target words.`);
      }
      targetWords.add(normalizedTarget);
      for (const distractorId of concept.distractorIds) {
        if (!lesson.conceptIds.includes(distractorId)) {
          errors.push(
            `Distractor ${distractorId} for ${conceptId} is outside its lesson.`,
          );
        }
      }
    }
  }

  if (pack.lessons.length !== 4 || pack.concepts.length !== 24) {
    errors.push("The pilot pack must contain four lessons and 24 concepts.");
  }
  if (usedConceptIds.size !== pack.concepts.length) {
    errors.push("Every concept must belong to exactly one lesson.");
  }

  return errors;
}

export function createRun(
  pack: ContentPack,
  lessonId: string,
  seed: number,
  priorityNextRun: readonly string[] = [],
  startedAt = new Date().toISOString(),
): RunState {
  const errors = validateContentPack(pack);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const lesson = pack.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) {
    throw new Error(`Unknown lesson: ${lessonId}`);
  }

  const random = createRandom(seed);
  const baseConceptIds = shuffle(lesson.conceptIds, random);
  const validPriorityIds = priorityNextRun.filter((id, index, all) => {
    return lesson.conceptIds.includes(id) && all.indexOf(id) === index;
  });
  const repeatCandidates = shuffle(lesson.conceptIds, random).filter(
    (id) => !validPriorityIds.includes(id),
  );
  const repeatConceptIds = [...validPriorityIds, ...repeatCandidates].slice(
    0,
    RUN_LENGTH - lesson.conceptIds.length,
  );
  const scheduledConcepts = [...baseConceptIds, ...repeatConceptIds];
  const sides: Side[] = [];

  const questions = scheduledConcepts.map((conceptId, index) => {
    const side = chooseSide(sides, random);
    sides.push(side);
    return questionFromConcept(
      pack,
      lesson.conceptIds,
      conceptId,
      side,
      index < lesson.conceptIds.length ? "base" : "repeat",
      random,
      index,
      seed,
    );
  });

  return {
    schemaVersion: 1,
    id: randomId("run"),
    lessonId,
    seed,
    startedAt,
    currentIndex: 0,
    correctCount: 0,
    status: "active",
    questions,
    priorityNextRun: [],
  };
}

export interface AnswerResult {
  run: RunState;
  correct: boolean;
  requeuedAt: number | null;
}

export function answerCurrent(
  pack: ContentPack,
  run: RunState,
  selectedSide: Side,
): AnswerResult {
  if (run.status !== "active") {
    throw new Error("Cannot answer a completed run.");
  }
  const current = run.questions[run.currentIndex];
  if (!current) {
    throw new Error("Current question is missing.");
  }
  if (current.selectedSide !== null) {
    throw new Error("Current question was already answered.");
  }

  const correct = current.correctSide === selectedSide;
  const questions = run.questions.map((question, index) =>
    index === run.currentIndex
      ? { ...question, selectedSide }
      : { ...question },
  );
  const priorityNextRun = [...run.priorityNextRun];
  let requeuedAt: number | null = null;

  if (!correct) {
    const occurrences = questions.filter(
      (question) => question.conceptId === current.conceptId,
    ).length;
    const lastTwo = run.currentIndex >= questions.length - 2;
    if (!lastTwo && occurrences < 3) {
      const lesson = pack.lessons.find((item) => item.id === run.lessonId);
      if (!lesson) {
        throw new Error(`Unknown lesson: ${run.lessonId}`);
      }
      const concept = conceptById(pack, current.conceptId);
      const firstDistractor = concept.distractorIds.find((id) =>
        lesson.conceptIds.includes(id),
      );
      if (!firstDistractor) {
        throw new Error(`No correction distractor for ${concept.id}`);
      }
      const correctionOffset = 2 + ((run.seed + run.currentIndex) % 3);
      const insertIndex = Math.min(
        run.currentIndex + correctionOffset,
        questions.length - 1,
      );
      requeuedAt = insertIndex;
      const correction: RunQuestion = {
        id: `${current.id}-correction-${insertIndex}`,
        conceptId: current.conceptId,
        distractorId: firstDistractor,
        correctSide:
          questions[insertIndex]?.correctSide ??
          (current.correctSide === "left" ? "right" : "left"),
        selectedSide: null,
        origin: "correction",
      };
      questions.splice(insertIndex, 0, correction);
      let removableRepeatIndex = -1;
      for (let index = questions.length - 1; index > insertIndex; index -= 1) {
        if (questions[index]?.origin === "repeat") {
          removableRepeatIndex = index;
          break;
        }
      }
      if (removableRepeatIndex >= 0) {
        questions.splice(removableRepeatIndex, 1);
      } else {
        questions.pop();
      }
      questions.splice(
        0,
        questions.length,
        ...limitFutureSideStreaks(questions, run.currentIndex + 1),
      );
    }

    if (requeuedAt === null && !priorityNextRun.includes(current.conceptId)) {
      priorityNextRun.push(current.conceptId);
    }
  }

  return {
    run: {
      ...run,
      questions,
      correctCount: run.correctCount + (correct ? 1 : 0),
      priorityNextRun,
    },
    correct,
    requeuedAt,
  };
}

export function advanceRun(run: RunState): RunState {
  const current = run.questions[run.currentIndex];
  if (!current || current.selectedSide === null) {
    throw new Error("Answer the current question before advancing.");
  }
  if (run.currentIndex === run.questions.length - 1) {
    return { ...run, status: "complete" };
  }
  return { ...run, currentIndex: run.currentIndex + 1 };
}

export function optionsForQuestion(
  pack: ContentPack,
  question: RunQuestion,
): Record<Side, Concept> {
  const correct = conceptById(pack, question.conceptId);
  const distractor = conceptById(pack, question.distractorId);
  return question.correctSide === "left"
    ? { left: correct, right: distractor }
    : { left: distractor, right: correct };
}

export function maxConsecutiveSide(questions: readonly RunQuestion[]): number {
  let max = 0;
  let current = 0;
  let previous: Side | null = null;
  for (const question of questions) {
    current = question.correctSide === previous ? current + 1 : 1;
    previous = question.correctSide;
    max = Math.max(max, current);
  }
  return max;
}

export const ENGINE_RULES = {
  runLength: RUN_LENGTH,
  baseConceptCount: 6,
} as const;
