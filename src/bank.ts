import { categoryKeys } from './categories.ts';
import type { Category } from './categories.ts';

const officialPapers = {
  '2025': 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_a_qs.pdf',
  '2026': 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf',
} as const;

export const CHOICE_IDS = ['1', '2', '3', '4'] as const;
export type ChoiceId = typeof CHOICE_IDS[number];
export type SourceKind = 'official' | 'mock';
export const sourceLabels = { official: 'IPA 真题改编', mock: '原创模拟题' } as const;

export type ExamItem = {
  id: string;
  category: Category;
  prompt: string;
  choices: Record<ChoiceId, string>;
  correctId: ChoiceId;
  explanation: string;
  source?: { year: number; number: number; url: string };
};

export function parseBank(raw: string): ExamItem[] {
  const ids = new Set<string>();
  return raw.replace(/^\uFEFF/, '').split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    const [category, id, prompt, first, second, third, fourth, correctId, explanation, ...extra] =
      line.split('|').map(field => field.trim());
    const choices = { 1: first, 2: second, 3: third, 4: fourth };
    const official = /^(2025|2026)-(0[1-9]|1[0-9]|20)$/.exec(id);
    if (!categoryKeys.includes(category as Category) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
        ids.has(id) || extra.length || !prompt || !explanation ||
        !CHOICE_IDS.includes(correctId as ChoiceId) || Object.values(choices).some(choice => !choice) ||
        new Set(Object.values(choices)).size !== 4) {
      throw new Error(`题库格式错误，第 ${index + 1} 行`);
    }
    ids.add(id);
    const year = official?.[1] as keyof typeof officialPapers;
    const source = official ? { year: Number(year), number: Number(official[2]), url: officialPapers[year] } : undefined;
    return [{ id, category: category as Category, prompt, choices, correctId: correctId as ChoiceId, explanation, source }];
  });
}
