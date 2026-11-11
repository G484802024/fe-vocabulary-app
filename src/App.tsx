import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { parseBank } from './bank.ts';
import type { Term } from './bank.ts';
import { categories, categoryKeys } from './categories.ts';
import type { Category } from './categories.ts';
import { Icon } from './icons.tsx';
import { accuracy, addUnique, advance, emptyLearning, finishPractice, loadLearning, makePractice, POINTS, practiceCounts, recordAnswer, SIZES, STORAGE_KEY, tally } from './quiz.ts';
import type { Learning, Result } from './quiz.ts';

const bank = parseBank(import.meta.glob('./data/*.txt', { eager: true, query: '?raw', import: 'default' }));
const terms = new Map(bank.map(term => [term.id, term]));
const grouped = Object.fromEntries(categoryKeys.map(key => [key, bank.filter(term => term.category === key)])) as Record<Category, Term[]>;
const nav = [
  ['home', '学习首页', 'home'], ['random', '随机练习', 'shuffle'], ['category', '分类练习', 'grid'],
  ['wrong', '错题本', 'retry'], ['favorites', '收藏夹', 'bookmark'], ['vocab', '词汇大全', 'book'],
  ['stats', '学习统计', 'chart'],
] as const;
type Page = typeof nav[number][0] | 'quiz' | 'result';
const formatNumber = (value: number) => value.toLocaleString('zh-CN');

function initialState() {
  try { return loadLearning(localStorage.getItem(STORAGE_KEY), terms); }
  catch { return emptyLearning(); }
}
function initialTheme() {
  try { return localStorage.getItem('fe-theme') === 'dark'; }
  catch { return false; }
}

function IconTile({ icon, color = 'blue' }: { icon: string; color?: string }) {
  return <span className={`icon-tile tone-${color}`}><Icon name={icon}/></span>;
}

function Stats({ items }: { items: { icon: string; color: string; value: number | string; label: string }[] }) {
  return <div className="stats-grid">{items.map(item => <div className="stat" key={item.label}>
    <IconTile icon={item.icon} color={item.color}/>
    <div><strong>{typeof item.value === 'number' ? formatNumber(item.value) : item.value}</strong><span>{item.label}</span></div>
  </div>)}</div>;
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="page-heading"><h1>{title}</h1>{children && <p>{children}</p>}</div>;
}

function TermInfo({ term }: { term: Term }) {
  return <div className="term-info">
    <div className="term-title"><strong lang="ja">{term.ja}</strong><span>{term.zh}</span></div>
    <div className="english" lang="en">{term.en}</div>
    <p>{term.explanation}</p>
    <p className="example"><strong>应用例子</strong> {term.example}</p>
  </div>;
}

function History({ history }: { history: Result[] }) {
  if (!history.length) return <div className="empty"><IconTile icon="chart"/><h3>暂无练习记录</h3><p>完成一组练习后，可以在这里查看成绩。</p></div>;
  return <div className="history">{history.map(result => <div className="history-row" key={result.id}>
    <div><strong>{result.label}</strong><span>{new Date(result.date).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    <div>答对 {result.correct} / {result.total}</div><div>{accuracy(result.correct, result.total)}</div><strong>{result.correct * POINTS} 分</strong>
  </div>)}</div>;
}

export function App() {
  const [learning, setLearning] = useState(initialState);
  const [dark, setDark] = useState(initialTheme);
  const [page, setPage] = useState<Page>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category | ''>('');
  const [filter, setFilter] = useState<Category | ''>('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const [storageError, setStorageError] = useState(false);
  const [confirmStart, setConfirmStart] = useState<{ pool: Term[]; size: number; label: string; unlimited: boolean } | null>(null);
  const [resultId, setResultId] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const categoryOptions = useRef<HTMLElement>(null);
  const progress = learning.active;
  const question = progress?.questions[progress.index];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(learning));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [learning]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('fe-theme', dark ? 'dark' : 'light'); }
    catch { /* Theme still works for the current visit. */ }
  }, [dark]);
  useEffect(() => {
    if (confirmStart) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirmStart]);
  useEffect(() => {
    if (page === 'quiz') questionHeading.current?.focus();
  }, [page, question?.termId, progress?.id]);
  useEffect(() => {
    if (page === 'category' && category) categoryOptions.current?.scrollIntoView({ block: 'nearest' });
  }, [category, page]);

  function go(next: Page) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }

  function toggleFavorite(id: string) {
    setLearning(state => ({
      ...state,
      favorites: state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id],
    }));
  }

  function launch(pool: Term[], size: number, label: string, unlimited = false) {
    const active = makePractice(bank, pool, size, label, unlimited);
    setLearning(state => ({ ...state, active }));
    setConfirmStart(null);
    go('quiz');
  }

  function start(pool: Term[], size: number, label: string, unlimited = false) {
    if (!pool.length) return;
    if (progress) setConfirmStart({ pool, size, label, unlimited });
    else launch(pool, size, label, unlimited);
  }

  function favoriteButton(term: Term) {
    const saved = learning.favorites.includes(term.id);
    return <button className={`icon-button favorite ${saved ? 'saved' : ''}`} type="button"
      aria-pressed={saved} aria-label={saved ? '取消收藏' : '收藏词汇'} title={saved ? '取消收藏' : '收藏词汇'}
      onClick={() => toggleFavorite(term.id)}><Icon name="bookmark" size={19}/></button>;
  }

  function sizes(pool: Term[], label: string, all = false, unlimited = false) {
    return <div className="size-grid">
      {SIZES.map(size => <button key={size} className="size-button" disabled={size > pool.length} onClick={() => start(pool, size, label)}>
        <strong>{size}</strong><span>道题</span>
      </button>)}
      {(all || pool.length < 100) && <button className="size-button" disabled={!pool.length}
        onClick={() => start(pool, pool.length, label)}><strong>全部</strong><span>{formatNumber(pool.length)} 道题</span></button>}
      {unlimited && <button className="size-button" disabled={!pool.length}
        onClick={() => start(pool, pool.length, '无限练习', true)}><strong>无限练习</strong><span>随时结算</span></button>}
    </div>;
  }

  const lifetime = [
    { icon: 'target', color: 'blue', value: learning.answered, label: '累计答题' },
    { icon: 'check', color: 'mint', value: accuracy(learning.correct, learning.answered), label: '正确率' },
    { icon: 'bolt', color: 'amber', value: learning.correct * POINTS, label: '累计得分' },
    { icon: 'book', color: 'violet', value: learning.studied.filter(id => terms.has(id)).length, label: '已学习词汇' },
  ];
  const quick = [
    ['random', '随机练习', '按题量随机抽题，随时开始。', 'shuffle', 'blue'],
    ['category', '分类练习', '按知识领域做专项练习。', 'grid', 'violet'],
    ['wrong', '错题本', '重做答错的题，查漏补缺。', 'retry', 'rose'],
    ['favorites', '收藏夹', '集中复习收藏的词汇。', 'bookmark', 'amber'],
    ['vocab', '词汇大全', '查找日语词汇和中文释义。', 'book', 'cyan'],
    ['stats', '学习统计', '回顾得分、正确率和练习记录。', 'chart', 'mint'],
  ] as const;

  function home() {
    return <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label"><Icon name="book" size={16}/> 基本情報技術者試験 · FE</div>
          <h1>FE 基础词汇学习</h1>
          <p>练习日语四选一，用中文解析掌握基础 IT 词汇。</p>
          <button className="button hero-button" onClick={() => go(progress ? 'quiz' : 'random')}>
            {progress ? '继续练习' : '开始练习'} <Icon name="arrow" size={18}/>
          </button>
          {progress && <span className="hero-progress">{progress.previous
            ? `已答 ${practiceCounts(progress).answered} 题`
            : `第 ${progress.index + 1} / ${progress.questions.length} 题`}</span>}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit"></div><div className="art-star">✦</div>
          <div className="art-card art-back"></div>
          <div className="art-card art-front">
            <div className="art-chip"><Icon name="code" size={26}/></div>
            <div lang="ja" className="art-title">基本情報</div>
            <div className="art-line"></div><div className="art-line short"></div>
          </div>
          <span className="art-float"><Icon name="check" size={25}/></span>
        </div>
      </section>
      <section className="dashboard-section">
        <div className="section-heading"><h2>学习概览</h2><button className="text-button" onClick={() => go('stats')}>查看统计 <Icon name="chevron" size={15}/></button></div>
        <Stats items={lifetime}/>
      </section>
      <section className="dashboard-section">
        <div className="section-heading"><h2>学习模式</h2><span className="muted">{formatNumber(bank.length)} 个词汇 · {categoryKeys.length} 个分类</span></div>
        <div className="quick-grid">{quick.map(([id, label, desc, icon, color]) => <button className="quick-card" key={id} onClick={() => go(id)}>
          <IconTile icon={icon} color={color}/><div><strong>{label}</strong><span>{desc}</span></div><Icon name="chevron" size={17}/>
        </button>)}</div>
      </section>
    </>;
  }

  function random() {
    return <><Heading title="随机练习">从 {formatNumber(bank.length)} 个词汇中随机抽题。</Heading>
      <section className="panel"><h2>选择题量</h2>{sizes(bank, '随机练习', false, true)}
        <p className="muted">每组题目和选项都会重新打乱。无限练习可以随时结束并查看成绩。</p>
      </section></>;
  }

  function categoryPage() {
    return <><Heading title="分类练习">选一个领域进行专项练习。</Heading>
      <div className="category-grid">{categoryKeys.map(key => {
        const [name, icon, color] = categories[key];
        return <button className={`quick-card ${category === key ? 'selected-card' : ''}`} aria-pressed={category === key}
          key={key} onClick={() => setCategory(key)}>
          <IconTile icon={icon} color={color}/><div><strong>{name}</strong><span>{grouped[key].length} 个词汇</span></div>
        </button>;
      })}</div>
      {category && <section className="panel spaced" ref={categoryOptions}><h2>{categories[category][0]} · 选择题量</h2>
        {sizes(grouped[category], categories[category][0], true)}</section>}
    </>;
  }

  function vocabulary() {
    const needle = query.trim().normalize('NFKC').toLowerCase();
    const matches = (filter ? grouped[filter] : bank).filter(term => !needle ||
      [term.ja, term.zh, term.en].some(text => text.normalize('NFKC').toLowerCase().includes(needle)));
    return <><Heading title="词汇大全">浏览日语、英语和中文词汇，查看释义与应用例子。</Heading>
      <div className="filter-bar">
        <label className="search-box"><Icon name="search" size={19}/><input type="search" placeholder="搜索日语、英语或中文词汇"
          aria-label="搜索词汇" value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }}/></label>
        <select aria-label="词汇分类" value={filter} onChange={event => { setFilter(event.target.value as Category | ''); setLimit(24); }}>
          <option value="">所有分类</option>{categoryKeys.map(key => <option key={key} value={key}>{categories[key][0]}</option>)}
        </select>
      </div>
      <p className="muted" aria-live="polite">{formatNumber(matches.length)} 个词汇</p>
      {matches.length ? <div className="term-grid">{matches.slice(0, limit).map(term => <article className="panel term-card" key={term.id}>
        <div className="term-top"><span className="pill">{categories[term.category][0]}</span>{favoriteButton(term)}</div>
        <TermInfo term={term}/>
        <button className="text-button" disabled={learning.studied.includes(term.id)}
          onClick={() => setLearning(state => ({ ...state, studied: addUnique(state.studied, term.id) }))}>
          <Icon name="check" size={16}/> {learning.studied.includes(term.id) ? '已学习' : '标记为已学习'}
        </button>
      </article>)}</div> : <div className="empty"><IconTile icon="search"/><h3>没有匹配的词汇</h3><p>可以更换关键词或选择其他分类。</p></div>}
      {matches.length > limit && <div className="center spaced"><button className="button secondary" onClick={() => setLimit(limit + 24)}>显示更多</button></div>}
    </>;
  }

  function collection(kind: 'wrong' | 'favorites') {
    const wrong = kind === 'wrong';
    const label = wrong ? '错题本' : '收藏夹';
    const items = learning[kind].flatMap(id => { const term = terms.get(id); return term ? [term] : []; });
    return <><Heading title={label}>{wrong ? '复习答错的词汇，熟悉后可移除记录。' : '把想反复练习的词汇集中起来。'}</Heading>
      {!items.length ? <div className="empty"><IconTile icon={wrong ? 'retry' : 'bookmark'}/><h3>{wrong ? '暂无错题' : '暂无收藏'}</h3>
        <p>{wrong ? '练习中答错的词汇会自动出现在这里。' : '在词汇大全或答题页点击收藏图标即可添加。'}</p>
        <button className="button secondary" onClick={() => go(wrong ? 'random' : 'vocab')}>{wrong ? '去练习' : '浏览词汇'}</button></div>
        : <><section className="panel"><h2>{items.length} 个词汇</h2>{sizes(items, label, true)}</section>
          <div className="term-grid spaced">{items.map(term => <article className="panel term-card" key={term.id}>
            <div className="term-top"><span className="pill">{categories[term.category][0]}</span>
              {wrong ? <button className="icon-button" aria-label={`删除错题 ${term.ja}`} title="删除错题"
                onClick={() => setLearning(state => ({ ...state, wrong: state.wrong.filter(id => id !== term.id) }))}><Icon name="trash" size={18}/></button>
                : favoriteButton(term)}</div>
            <TermInfo term={term}/>
          </article>)}</div></>}
    </>;
  }

  function statsPage() {
    return <><Heading title="学习统计">查看累计表现和每次完成的练习。</Heading>
      <Stats items={[...lifetime,
        { icon: 'check', color: 'mint', value: learning.correct, label: '累计答对' },
        { icon: 'close', color: 'rose', value: learning.answered - learning.correct, label: '累计答错' },
      ]}/>
      <section className="panel spaced"><h2>练习历史</h2><History history={learning.history}/></section>
    </>;
  }

  function quiz() {
    if (!progress || !question) return <><Heading title="没有进行中的练习"/><button className="button primary" onClick={() => go('random')}>开始练习</button></>;
    const term = terms.get(question.termId)!;
    const counts = practiceCounts(progress);
    const answered = question.answerId !== undefined;
    const correct = question.answerId === term.id;
    const last = progress.index === progress.questions.length - 1;
    const unlimited = !!progress.previous;
    const correctLetter = 'ABCD'[question.optionIds.indexOf(term.id)];

    function next() {
      const nextCycle = last && unlimited ? makePractice(bank, bank, bank.length, progress!.label).questions : undefined;
      const date = new Date().toISOString();
      setLearning(state => advance(state, progress!.id, term.id, date, nextCycle));
      if (last && !unlimited) { setResultId(progress!.id); go('result'); }
      else window.scrollTo(0, 0);
    }

    function finish() {
      const date = new Date().toISOString();
      setLearning(state => finishPractice(state, progress!.id, date));
      setResultId(progress!.id);
      go('result');
    }

    return <div className="quiz">
      <div className="quiz-top"><button className="text-button" onClick={() => go('home')}><Icon name="back" size={17}/> 返回首页</button>
        <span>{progress.label} · 第 {progress.index + 1 + (progress.previous?.answered ?? 0)}{!unlimited && ` / ${progress.questions.length}`} 题</span></div>
      <progress aria-label={unlimited ? '本轮题库进度' : '答题进度'} value={tally(progress.questions).answered} max={progress.questions.length}/>
      <div className="quiz-counts" aria-label="本组成绩">
        <span>得分 <b>{counts.correct * POINTS}</b></span><span>答对 <b>{counts.correct}</b></span>
        <span>答错 <b>{counts.answered - counts.correct}</b></span><span>正确率 <b>{accuracy(counts.correct, counts.answered)}</b></span>
      </div>
      <section className="panel quiz-card">
        <div className="term-top"><span className="pill">{categories[term.category][0]}</span>{favoriteButton(term)}</div>
        <h1 lang="ja" ref={questionHeading} tabIndex={-1}>「{term.ja}」の説明として、最も適切なものはどれですか。</h1>
        <div className="options">{question.optionIds.map((id, index) => {
          const isCorrect = answered && id === term.id;
          const isWrong = answered && id === question.answerId && !isCorrect;
          return <button key={id} className={`option ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong-answer' : ''}`}
            disabled={answered} onClick={() => setLearning(state => recordAnswer(state, progress.id, term.id, id))}>
            <span className="letter">{'ABCD'[index]}</span><span lang="ja">{terms.get(id)!.definition}</span>
            {isCorrect && <span className="option-status"><Icon name="check" size={19}/><span className="sr-only">正确选项</span></span>}
            {isWrong && <span className="option-status"><Icon name="close" size={19}/><span className="sr-only">你的错误选项</span></span>}
          </button>;
        })}</div>
        {answered && <div className={`feedback ${correct ? 'success' : 'failure'}`}>
          <div className="feedback-title" role="status"><Icon name={correct ? 'check' : 'close'} size={20}/>
            <strong>{correct ? '回答正确 · +10 分' : `回答错误 · 正确答案是 ${correctLetter}`}</strong></div>
          <TermInfo term={term}/>
        </div>}
        {(answered || (unlimited && counts.answered > 0)) && <div className="quiz-actions">
          {unlimited && counts.answered > 0 && <button className="button secondary" onClick={finish}>结束并结算</button>}
          {answered && <button className="button primary" onClick={next}>
            {last && !unlimited ? '查看成绩' : '下一题'} <Icon name="arrow" size={18}/></button>}
        </div>}
      </section>
    </div>;
  }

  function result() {
    const entry = learning.history.find(item => item.id === resultId);
    if (!entry) return statsPage();
    return <><Heading title="练习完成">{entry.label} · {entry.total} 道题</Heading>
      <Stats items={[
        { icon: 'bolt', color: 'amber', value: entry.correct * POINTS, label: '本组得分' },
        { icon: 'check', color: 'mint', value: entry.correct, label: '答对' },
        { icon: 'close', color: 'rose', value: entry.total - entry.correct, label: '答错' },
        { icon: 'target', color: 'blue', value: accuracy(entry.correct, entry.total), label: '正确率' },
      ]}/>
      <div className="quiz-actions"><button className="button secondary" onClick={() => go('stats')}>查看学习统计</button>
        <button className="button primary" onClick={() => go('random')}>继续练习 <Icon name="arrow" size={18}/></button></div>
    </>;
  }

  const views = { home, random, category: categoryPage, wrong: () => collection('wrong'),
    favorites: () => collection('favorites'), vocab: vocabulary, stats: statsPage, quiz, result };
  const themeLabel = dark ? '切换浅色模式' : '切换深色模式';
  return <>
    <div className="shell">
      <header className="mobile-header">
        <button className="brand" onClick={() => go('home')}><span className="brand-mark"><Icon name="book" size={20}/></span><strong>FE 基础词汇</strong></button>
        <div className="mobile-actions">
          <button className="icon-button" onClick={() => setDark(!dark)} aria-label={themeLabel}><Icon name={dark ? 'sun' : 'moon'} size={19}/></button>
          <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="sidebar"
            aria-label={menuOpen ? '关闭导航' : '打开导航'}><Icon name={menuOpen ? 'close' : 'menu'} size={22}/></button>
        </div>
      </header>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} id="sidebar">
        <button className="brand desktop-brand" onClick={() => go('home')}>
          <span className="brand-mark"><Icon name="book" size={23}/></span><span><strong>FE 基础词汇</strong><small>基本情報技術者試験</small></span>
        </button>
        <nav aria-label="主导航">{nav.map(([id, label, icon]) => <button key={id}
          aria-current={page === id ? 'page' : undefined} className={page === id ? 'current' : ''}
          onClick={() => go(id)}><Icon name={icon} size={19}/><span>{label}</span></button>)}</nav>
        <button className="theme-button" onClick={() => setDark(!dark)} aria-label={themeLabel}>
          <Icon name={dark ? 'sun' : 'moon'} size={19}/>{dark ? '浅色模式' : '深色模式'}
        </button>
      </aside>
      <main className="main">
        {storageError && <p className="storage-error" role="alert">浏览器无法保存学习记录。请检查存储权限或可用空间。</p>}
        {views[page]()}
      </main>
    </div>
    <dialog ref={dialog} onCancel={() => setConfirmStart(null)}>
      <h2>开始新的练习？</h2><p>当前题组的答题进度将被替换，已经获得的分数和错题记录会保留。</p>
      <div className="quiz-actions"><button className="button secondary" autoFocus onClick={() => setConfirmStart(null)}>取消</button>
        <button className="button primary" onClick={() => confirmStart && launch(confirmStart.pool, confirmStart.size, confirmStart.label, confirmStart.unlimited)}>开始新练习</button></div>
    </dialog>
  </>;
}
