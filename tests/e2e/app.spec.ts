import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function navigate(page: Page, label: string) {
  const menu = page.getByRole('button', { name: '打开导航' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
}

async function correctIndex(page: Page): Promise<number> {
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('fe-vocabulary-app:v1')!).active);
  const { termId, optionIds } = active.questions[active.index];
  return optionIds.indexOf(termId);
}

async function answer(page: Page, correct: boolean) {
  const index = await correctIndex(page);
  await page.locator('.option').nth(correct ? index : (index + 1) % 4).click();
}

test('quiz feedback, score, favorites, wrong answers and recovery after reload', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'FE 基础词汇学习' })).toBeVisible();
  await page.getByRole('button', { name: '开始练习' }).click();
  await page.getByRole('button', { name: '10 道题', exact: true }).click();
  const options = page.locator('.option');
  await expect(options).toHaveCount(4);
  const question = await page.getByRole('heading', { level: 1 }).innerText();
  const optionText = await options.allTextContents();
  await page.getByRole('button', { name: '收藏词汇' }).click();
  await answer(page, false);
  await expect(page.getByRole('status')).toContainText('正确答案是');
  await expect(page.locator('.option.correct')).toHaveCount(1);
  await expect(page.locator('.option.wrong-answer')).toHaveCount(1);
  await expect(page.locator('.option:disabled')).toHaveCount(4);
  await expect(page.getByText('应用例子')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '继续练习' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(question);
  expect((await options.allTextContents()).map(text => text.replace(/正确选项|你的错误选项/g, ''))).toEqual(optionText);
  await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('回答错误');
  await page.getByRole('button', { name: '下一题' }).click();
  await answer(page, true);
  await expect(page.getByRole('status')).toContainText('回答正确');
  await expect(page.locator('.quiz-counts')).toContainText('得分 10');
  await expect(page.locator('.quiz-counts')).toContainText('正确率 50%');
  await navigate(page, '错题本');
  await expect(page.getByRole('heading', { name: '错题本' })).toBeVisible();
  await page.getByRole('button', { name: /删除错题/ }).click();
  await expect(page.getByRole('heading', { name: '暂无错题' })).toBeVisible();
  await navigate(page, '收藏夹');
  await expect(page.locator('.term-card')).toHaveCount(1);
  await page.getByRole('button', { name: '全部 1 道题' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: '全部 1 道题' }).click();
  await page.getByRole('button', { name: '开始新练习' }).click();
  await answer(page, true);
  await page.getByRole('button', { name: '查看成绩' }).click();
  await expect(page.getByRole('heading', { name: '练习完成' })).toBeVisible();
  await page.getByRole('button', { name: '查看学习统计' }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('10 分');
  await expect(page.locator('.stat').filter({ hasText: '累计得分' })).toContainText('20');
});

test('category selection, trilingual search, theme, unlimited practice and responsive layout', async ({ page }) => {
  await page.goto('./');
  const noOverflow = () => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await noOverflow();
  await navigate(page, '分类练习');
  await expect(page.locator('.category-grid button')).toHaveCount(12);
  await page.getByRole('button', { name: /硬件与外设/ }).click();
  await expect(page.getByRole('heading', { name: '硬件与外设 · 选择题量' })).toBeVisible();
  await navigate(page, '词汇大全');
  await page.getByRole('combobox', { name: '词汇分类' }).selectOption('hardware');
  const search = page.getByRole('searchbox', { name: '搜索词汇' });
  await search.fill('Central Processing Unit');
  const card = page.locator('.term-card').filter({ hasText: 'Central Processing Unit' });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('中央处理器');
  await card.getByRole('button', { name: '标记为已学习' }).click();
  await expect(card.getByRole('button', { name: '已学习', exact: true })).toBeDisabled();
  await search.fill('中央处理器');
  await expect(card).toBeVisible();
  await search.fill('中央処理装置');
  await expect(card).toBeVisible();
  await noOverflow();
  await page.getByRole('button', { name: '切换深色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await navigate(page, '随机练习');
  await page.getByRole('button', { name: /无限练习/ }).click();
  await noOverflow();
  await answer(page, true);
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('button', { name: '结束并结算' }).click();
  await expect(page.getByRole('heading', { name: '练习完成' })).toBeVisible();
  await expect(page.locator('.stat').filter({ hasText: '本组得分' })).toContainText('10');
});

test('installed service worker loads the app offline', async ({ page, context }) => {
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'FE 基础词汇学习' })).toBeVisible();
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('heading', { name: '随机练习' })).toBeVisible();
});
