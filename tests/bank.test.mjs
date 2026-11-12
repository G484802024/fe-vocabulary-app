import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHOICE_IDS, parseBank } from '../src/bank.ts';
import { categoryKeys } from '../src/categories.ts';
import { makePractice } from '../src/quiz.ts';

const raw = readFileSync(new URL('../src/data/questions.txt', import.meta.url), 'utf8');
const bank = parseBank(raw);
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');

test('contains at least 100 distinct questions covering all categories and both source types', () => {
  assert.ok(bank.length >= 100);
  assert.equal(new Set(bank.map(item => item.id)).size, bank.length);
  assert.equal(new Set(bank.map(item => normalize(item.prompt))).size, bank.length);
  for (const key of categoryKeys) {
    assert.ok(bank.some(item => item.category === key), key);
  }
  for (const item of bank) {
    assert.match(item.prompt, /[\p{Script=Hiragana}\p{Script=Katakana}]/u, item.id);
    assert.match(item.explanation, /\p{Script=Han}/u, item.id);
    assert.equal(new Set(Object.values(item.choices).map(normalize)).size, 4, item.id);
    assert.ok(item.choices[item.correctId], item.id);
  }
  assert.deepEqual([...new Set(bank.flatMap(item => item.source ? [item.source.year] : []))], [2025, 2026]);
  assert.ok(bank.some(item => !item.source));
});

test('practice shuffles only the four authored choices and retains their correct answer', () => {
  const byId = new Map(bank.map(item => [item.id, item]));
  const positions = new Set();
  for (let pass = 0; pass < 3; pass++) {
    const practice = makePractice(bank, bank.length, '题库验证');
    assert.equal(new Set(practice.questions.map(question => question.itemId)).size, bank.length);
    for (const question of practice.questions) {
      const item = byId.get(question.itemId);
      assert.deepEqual([...question.optionIds].sort(), [...CHOICE_IDS]);
      assert.equal(question.correctId, item.correctId);
      positions.add(question.optionIds.indexOf(question.correctId));
    }
  }
  assert.equal(positions.size, 4);
});

test('invalid or duplicate rows fail before practice starts', () => {
  const row = raw.split('\n').find(line => line.startsWith('fundamentals|2025-01|'));
  assert.throws(() => parseBank(row + '\n' + row), /第 2 行/);
  const fields = row.split('|');
  fields[7] = '5';
  assert.throws(() => parseBank(fields.join('|')), /第 1 行/);
});
