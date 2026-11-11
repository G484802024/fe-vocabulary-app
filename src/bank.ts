import { categoryKeys } from './categories.ts';
import type { Category } from './categories.ts';

export type Term = {
  id: string;
  category: Category;
  topic: string;
  ja: string;
  en: string;
  zh: string;
  definition: string;
  explanation: string;
  example: string;
};

export function parseBank(files: Record<string, string>): Term[] {
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).flatMap(([path, source]) => {
    const category = path.split('/').at(-1)?.replace('.txt', '') as Category;
    if (!categoryKeys.includes(category)) throw new Error(`未知分类 ${path}`);
    let topic = '';
    return source.replace(/^\uFEFF/, '').split(/\r?\n/).flatMap((raw, index) => {
      const line = raw.trim();
      if (!line) return [];
      if (line.startsWith('# ')) {
        topic = line.slice(2);
        return [];
      }
      const [key, ja, en, zh, definition, explanation, example, ...extra] = line.split('|').map(part => part.trim());
      if (!topic || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) ||
          extra.length || ![ja, en, zh, definition, explanation, example].every(Boolean)) {
        throw new Error(`词条格式错误 ${path} 第 ${index + 1} 行`);
      }
      return [{ id: `${category}:${key}`, category, topic, ja, en, zh, definition, explanation, example }];
    });
  });
}
