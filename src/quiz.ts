import { CHOICE_IDS } from './bank.ts';
import type { ChoiceId, ExamItem } from './bank.ts';

export const POINTS = 10;
export const SIZES = [10, 20, 50, 100] as const;
export const STORAGE_KEY = 'fe-question-bank:v1';

export type Question = { itemId: string; optionIds: ChoiceId[]; correctId: ChoiceId; answerId?: ChoiceId };
type Counts = { answered: number; correct: number };
export type Practice = {
  id: string;
  label: string;
  index: number;
  questions: Question[];
  previous?: Counts;
};
export type Result = { id: string; label: string; date: string; total: number; correct: number };
export type Learning = {
  answered: number;
  correct: number;
  studied: string[];
  wrong: string[];
  favorites: string[];
  history: Result[];
  active: Practice | null;
};
export const emptyLearning = (): Learning => ({
  answered: 0, correct: 0, studied: [], wrong: [], favorites: [], history: [], active: null,
});

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function makePractice(pool: readonly ExamItem[], size: number, label: string, unlimited = false): Practice {
  return {
    id: crypto.randomUUID(),
    label,
    index: 0,
    previous: unlimited ? { answered: 0, correct: 0 } : undefined,
    questions: shuffle(pool).slice(0, size).map(item => ({
      itemId: item.id,
      optionIds: shuffle(CHOICE_IDS),
      correctId: item.correctId,
    })),
  };
}

export function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function recordAnswer(state: Learning, practiceId: string, itemId: string, optionId: ChoiceId): Learning {
  const practice = state.active;
  const question = practice?.questions[practice.index];
  if (!practice || practice.id !== practiceId || !question || question.itemId !== itemId ||
      question.answerId !== undefined || !question.optionIds.includes(optionId)) return state;
  const correct = optionId === question.correctId;
  return {
    ...state,
    answered: state.answered + 1,
    correct: state.correct + Number(correct),
    studied: addUnique(state.studied, itemId),
    wrong: correct ? state.wrong : addUnique(state.wrong, itemId),
    active: {
      ...practice,
      questions: practice.questions.map((entry, index) => index === practice.index
        ? { ...entry, answerId: optionId }
        : entry),
    },
  };
}

export function advance(state: Learning, practiceId: string, itemId: string, date: string, nextCycle?: Question[]): Learning {
  const practice = state.active;
  const question = practice?.questions[practice.index];
  if (!practice || practice.id !== practiceId || question?.itemId !== itemId || !question.answerId) return state;
  if (practice.index + 1 < practice.questions.length) {
    return { ...state, active: { ...practice, index: practice.index + 1 } };
  }
  if (practice.previous && nextCycle?.length) {
    return {
      ...state,
      active: { ...practice, index: 0, questions: nextCycle, previous: practiceCounts(practice) },
    };
  }
  return finishPractice(state, practiceId, date);
}

export function finishPractice(state: Learning, practiceId: string, date: string): Learning {
  const practice = state.active;
  if (!practice || practice.id !== practiceId) return state;
  const counts = practiceCounts(practice);
  if (!counts.answered) return state;
  const result = { id: practice.id, label: practice.label, date, total: counts.answered, correct: counts.correct };
  return { ...state, history: [result, ...state.history], active: null };
}

export function tally(questions: Question[]) {
  const answered = questions.filter(question => question.answerId !== undefined);
  return { answered: answered.length, correct: answered.filter(question => question.answerId === question.correctId).length };
}

export function practiceCounts(practice: Practice): Counts {
  const counts = tally(practice.questions);
  return {
    answered: counts.answered + (practice.previous?.answered ?? 0),
    correct: counts.correct + (practice.previous?.correct ?? 0),
  };
}

export function accuracy(correct: number, answered: number): string {
  return answered ? `${Math.round(correct / answered * 100)}%` : '0%';
}

export function loadLearning(raw: string | null, items: ReadonlyMap<string, ExamItem>): Learning {
  if (!raw) return emptyLearning();
  try {
    const state = { ...emptyLearning(), ...JSON.parse(raw) } as Learning;
    if (!Number.isSafeInteger(state.answered) || !Number.isSafeInteger(state.correct) ||
        state.correct < 0 || state.answered < state.correct ||
        ![state.studied, state.wrong, state.favorites, state.history].every(Array.isArray)) return emptyLearning();
    const practice = state.active;
    if (practice && (!Array.isArray(practice.questions) ||
        !Number.isInteger(practice.index) || practice.index < 0 || practice.index >= practice.questions.length ||
        practice.questions.some(question => !items.has(question.itemId) || items.get(question.itemId)?.correctId !== question.correctId ||
          !Array.isArray(question.optionIds) || new Set(question.optionIds).size !== 4 ||
          question.optionIds.length !== 4 ||
          question.optionIds.some(id => !CHOICE_IDS.includes(id)) ||
          (question.answerId !== undefined && !question.optionIds.includes(question.answerId))))) {
      return { ...state, active: null };
    }
    return state;
  } catch {
    return emptyLearning();
  }
}
