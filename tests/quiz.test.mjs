import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracy, advance, emptyLearning, finishPractice, loadLearning, practiceCounts, recordAnswer } from '../src/quiz.ts';

const optionIds = ['alpha', 'beta', 'gamma', 'delta'];
const byId = new Map(optionIds.map(id => [id, { id }]));
const setup = (unlimited = false) => ({
  ...emptyLearning(),
  active: {
    id: 'practice',
    label: '练习',
    index: 0,
    questions: ['alpha', 'beta'].map(termId => ({ termId, optionIds })),
    ...(unlimited && { previous: { answered: 0, correct: 0 } }),
  },
});
const timestamp = '2026-11-11T04:00:00.000Z';

test('answers are recorded only once, advance requires an answer and stale events are ignored', () => {
  let state = setup();
  assert.equal(advance(state, 'practice', 'alpha', timestamp), state);
  assert.equal(recordAnswer(state, 'practice', 'alpha', 'invalid'), state);
  state = recordAnswer(state, 'practice', 'alpha', 'beta');
  assert.equal(recordAnswer(state, 'practice', 'alpha', 'alpha'), state);
  assert.deepEqual(state.wrong, ['alpha']);
  assert.deepEqual(state.studied, ['alpha']);
  state = advance(state, 'practice', 'alpha', timestamp);
  assert.equal(advance(state, 'practice', 'alpha', timestamp), state);
  assert.equal(recordAnswer(state, 'old-practice', 'beta', 'beta'), state);
  state = recordAnswer(state, 'practice', 'beta', 'beta');
  assert.equal(accuracy(state.correct, state.answered), '50%');
  state = advance(state, 'practice', 'beta', timestamp);
  assert.equal(state.active, null);
  assert.deepEqual(state.history, [{ id: 'practice', label: '练习', date: timestamp, total: 2, correct: 1 }]);
});

test('progress restores the exact choice order and answer, and retains history if a term is removed', () => {
  const state = recordAnswer(setup(), 'practice', 'alpha', 'delta');
  assert.deepEqual(loadLearning(JSON.stringify(state), byId), state);
  const remaining = new Map(byId);
  remaining.delete('delta');
  const restored = loadLearning(JSON.stringify(state), remaining);
  assert.equal(restored.active, null);
  assert.equal(restored.answered, 1);
  assert.deepEqual(restored.wrong, ['alpha']);
  assert.deepEqual(loadLearning('{broken', byId), emptyLearning());
  assert.deepEqual(loadLearning(null, byId), emptyLearning());
});

test('unlimited practice rolls over a shuffled cycle and keeps cumulative counts when finishing', () => {
  let state = setup(true);
  assert.equal(finishPractice(state, 'practice', timestamp), state);
  state = recordAnswer(state, 'practice', 'alpha', 'alpha');
  state = advance(state, 'practice', 'alpha', timestamp);
  state = recordAnswer(state, 'practice', 'beta', 'delta');
  const next = setup().active.questions;
  state = advance(state, 'practice', 'beta', timestamp, next);
  assert.equal(state.active.index, 0);
  assert.deepEqual(practiceCounts(state.active), { answered: 2, correct: 1 });
  state = recordAnswer(state, 'practice', 'alpha', 'alpha');
  state = finishPractice(state, 'practice', timestamp);
  assert.equal(state.active, null);
  assert.equal(state.history[0].total, 3);
  assert.equal(state.history[0].correct, 2);
});
