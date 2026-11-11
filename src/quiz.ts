import type { Term } from './bank.ts';

export const POINTS = 10;
export const SIZES = [10, 20, 50, 100] as const;
export const STORAGE_KEY = 'fe-vocabulary-app:v1';

export type Question = { termId: string; optionIds: string[]; answerId?: string };
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

export function makePractice(bank: readonly Term[], pool: readonly Term[], size: number, label: string, unlimited = false): Practice {
  const groups = new Map<string, Term[]>();
  for (const term of bank) {
    const key = term.category + '/' + term.topic;
    const group = groups.get(key) ?? [];
    group.push(term);
    groups.set(key, group);
  }
  return {
    id: crypto.randomUUID(),
    label,
    index: 0,
    previous: unlimited ? { answered: 0, correct: 0 } : undefined,
    questions: shuffle(pool).slice(0, size).map(term => {
      const group = groups.get(term.category + '/' + term.topic) ?? [];
      const distractors = shuffle(group.filter(other => other.id !== term.id)).slice(0, 3);
      if (distractors.length !== 3) throw new Error(`词条缺少同主题干扰项 ${term.id}`);
      return { termId: term.id, optionIds: shuffle([term.id, ...distractors.map(other => other.id)]) };
    }),
  };
}

export function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function recordAnswer(state: Learning, practiceId: string, termId: string, optionId: string): Learning {
  const practice = state.active;
  const question = practice?.questions[practice.index];
  if (!practice || practice.id !== practiceId || !question || question.termId !== termId ||
      question.answerId !== undefined || !question.optionIds.includes(optionId)) return state;
  const correct = optionId === termId;
  return {
    ...state,
    answered: state.answered + 1,
    correct: state.correct + Number(correct),
    studied: addUnique(state.studied, termId),
    wrong: correct ? state.wrong : addUnique(state.wrong, termId),
    active: {
      ...practice,
      questions: practice.questions.map((entry, index) => index === practice.index
        ? { ...entry, answerId: optionId }
        : entry),
    },
  };
}

export function advance(state: Learning, practiceId: string, termId: string, date: string, nextCycle?: Question[]): Learning {
  const practice = state.active;
  const question = practice?.questions[practice.index];
  if (!practice || practice.id !== practiceId || question?.termId !== termId || !question.answerId) return state;
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
  return { answered: answered.length, correct: answered.filter(question => question.answerId === question.termId).length };
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

export function loadLearning(raw: string | null, terms: ReadonlyMap<string, Term>): Learning {
  if (!raw) return emptyLearning();
  try {
    const state = { ...emptyLearning(), ...JSON.parse(raw) } as Learning;
    if (!Number.isSafeInteger(state.answered) || !Number.isSafeInteger(state.correct) ||
        state.correct < 0 || state.answered < state.correct ||
        ![state.studied, state.wrong, state.favorites, state.history].every(Array.isArray)) return emptyLearning();
    const practice = state.active;
    if (practice && (!Array.isArray(practice.questions) ||
        !Number.isInteger(practice.index) || practice.index < 0 || practice.index >= practice.questions.length ||
        practice.questions.some(question => !terms.has(question.termId) ||
          !Array.isArray(question.optionIds) || new Set(question.optionIds).size !== 4 ||
          question.optionIds.length !== 4 || !question.optionIds.includes(question.termId) ||
          question.optionIds.some(id => !terms.has(id)) ||
          (question.answerId !== undefined && !question.optionIds.includes(question.answerId))))) {
      return { ...state, active: null };
    }
    return state;
  } catch {
    return emptyLearning();
  }
}
