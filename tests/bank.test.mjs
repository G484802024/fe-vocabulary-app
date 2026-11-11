import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBank } from '../src/bank.ts';
import { categoryKeys } from '../src/categories.ts';
import { makePractice } from '../src/quiz.ts';

const data = new URL('../src/data/', import.meta.url);
const sources = Object.fromEntries(readdirSync(data).filter(name => name.endsWith('.txt'))
  .map(name => [name, readFileSync(new URL(name, data), 'utf8')]));
const bank = parseBank(sources);
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

test('contains 1,000+ unique terms with Japanese choices and Chinese learning content', () => {
  assert.ok(bank.length >= 1000, `Only ${bank.length} terms`);
  for (const field of ['id', 'ja', 'en', 'zh', 'definition']) {
    const seen = new Map();
    for (const term of bank) {
      const key = normalize(term[field]);
      assert.ok(!seen.has(key), `Duplicate ${field}: ${seen.get(key)} / ${term.id} (${term[field]})`);
      seen.set(key, term.id);
    }
  }
  for (const term of bank) {
    assert.match(term.definition, /[\p{Script=Hiragana}\p{Script=Katakana}]/u, term.id);
    assert.match(term.explanation, /\p{Script=Han}/u, term.id);
    assert.match(term.example, /\p{Script=Han}/u, term.id);
    assert.match(term.en, /[A-Za-z]/, term.id);
  }
  for (const key of categoryKeys) {
    assert.ok(bank.filter(term => term.category === key).length >= 50, key);
  }
});

test('builds one valid question for every term with same-topic distractors and randomized positions', () => {
  const byId = new Map(bank.map(term => [term.id, term]));
  const positions = [0, 0, 0, 0];
  for (let pass = 0; pass < 3; pass++) {
    const practice = makePractice(bank, bank, bank.length, '题库验证');
    assert.equal(new Set(practice.questions.map(question => question.termId)).size, bank.length);
    for (const question of practice.questions) {
      const term = byId.get(question.termId);
      assert.equal(question.optionIds.length, 4);
      assert.equal(new Set(question.optionIds).size, 4);
      assert.equal(question.optionIds.filter(id => id === term.id).length, 1);
      const choices = question.optionIds.map(id => byId.get(id));
      assert.equal(new Set(choices.map(option => normalize(option.definition))).size, 4);
      assert.ok(choices.every(option => option.category === term.category && option.topic === term.topic), term.id);
      positions[question.optionIds.indexOf(term.id)]++;
    }
  }
  assert.ok(positions.every(count => count > bank.length / 3), String(positions));
});
