# FE 科目 A 题库

日本基本情報技術者試験（FE）科目 A 日语四选一练习。收录 100 道题，包括 38 道 IPA 公开真题改编和 62 道原创模拟题，覆盖 12 个知识领域。答题后立即显示对错、正确选项和中文解析，答对得 10 分。

[在线练习](https://g484802024.github.io/fe-vocabulary-app/)

## 使用方式

- 随机练习可选题目来源、题量或无限练习。分类练习可选知识领域。
- 错题自动进入错题本，可以重做或移除。收藏夹也支持单独练习。
- 题库可按分类、来源和关键词查找，展开题目可查看选项与解析。改编题附 IPA 原卷链接和题号。
- 学习统计显示累计得分、正确率和练习记录。进度保存在当前浏览器，回到首页可继续未完成的题组。新版题库使用独立的本地记录，旧词汇练习的数据仍保存在原有存储项。
- 可通过手机浏览器添加到主屏幕。首次在线打开并完成缓存后，可离线练习。

## 本地运行与验证

需要 Node.js 22.18 或更高版本，部署使用 Node.js 24。

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试覆盖桌面和手机视口，并用 GitHub Pages 的子路径验证离线加载。已安装 Edge 时，可通过环境变量 `PLAYWRIGHT_CHANNEL=msedge` 运行测试。

## 更新题库

题库位于 `src/data/questions.txt`，使用 UTF-8。每行以竖线分隔，字段依次为分类、稳定题目 ID、日语题干、四个选项、正确选项序号（1 至 4）、简体中文解析。以 `#` 开头的行是注释。已发布题目应保留 ID 和选项顺序，避免影响已保存的答题进度。

真题改编的 ID 由年份和原卷题号组成，例如 `2025-03`。原创题参考 [IPA 考试大纲](https://www.ipa.go.jp/shiken/syllabus/gaiyou.html)。真题改编来源为 IPA 的 [2025 年度](https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_a_qs.pdf)及 [2026 年度](https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf)科目 A 公开问题，题干、选项和数据可按练习需要调整。中文解析为本项目编写。

## 部署

推送到 `main` 会触发 GitHub Actions。通过单元测试、构建和浏览器测试后，工作流发布到原 GitHub Pages 地址。
