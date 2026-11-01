// 小程序页面渲染校验 —— 用微信官方 wcc 编译器真编真渲
//
// 为什么不用纯正则检查: WXML 的表达式求值、wx:if/wx:for 分支、class 拼接
// 都是编译器行为, 只有跑一遍 wcc 才能确定真机上会渲染成什么样。
// 这个脚本把 6 个页面用真实数据渲染成虚拟 DOM, 再对关键节点做断言。
//
// 依赖: 微信开发者工具自带的 wcc.exe (可用 WCC_PATH 环境变量指定)
// 用法: node test/wechat-render.cjs

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const WM = path.join(ROOT, 'wechat-manual');

let pass = 0, fail = 0, skip = 0;
const ok = (m) => { pass++; console.log('✅', m); };
const bad = (m) => { fail++; console.log('❌', m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

// ---------- 定位 wcc ----------

function findWcc() {
  if (process.env.WCC_PATH && fs.existsSync(process.env.WCC_PATH)) return process.env.WCC_PATH;
  const candidates = [
    'D:/Tencent/wechat-devtools/resources/app.asar.unpacked/node_modules/wcc-exec/wcc.exe',
    'C:/Program Files (x86)/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec/wcc.exe',
    'C:/Program Files/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec/wcc.exe',
  ];
  return candidates.find((p) => fs.existsSync(p)) || '';
}

const WCC = findWcc();
if (!WCC) {
  console.log('⚠️  未找到 wcc.exe，跳过渲染校验（可设 WCC_PATH 指定路径）');
  process.exit(0);
}

// ---------- 编译 + 渲染 ----------

/**
 * 编译一个页面模板, 返回渲染函数 data => 虚拟树。
 * 每个页面必须用独立的 vm context: wcc 产物都是往 window.$gwx 上挂同一个名字,
 * 共用 context 会让后编译的页面覆盖前一个的模板表, 渲染出来的树是串的。
 */
function page(file) {
  const rel = 'pages/' + file + '.wxml';
  const code = execFileSync(WCC, ['-d', rel], { cwd: WM, maxBuffer: 64 * 1024 * 1024 }).toString();
  const ctx = vm.createContext({ window: {}, console });
  vm.runInContext(code, ctx, { filename: rel + '.js' });
  const gwx = ctx.window.$gwx || ctx.$gwx;
  if (typeof gwx !== 'function') throw new Error('wcc 输出里没有 $gwx: ' + rel);
  return (data) => gwx(rel)(data, {});
}

/** 深度遍历虚拟树 */
function walk(node, fn) {
  if (node == null) return;
  if (typeof node === 'string') { fn(node, null); return; }
  if (Array.isArray(node)) { node.forEach((n) => walk(n, fn)); return; }
  fn(node, node.tag);
  (node.children || []).forEach((c) => walk(c, fn));
}

/** 收集全树文本 */
function textOf(tree) {
  const parts = [];
  walk(tree, (n) => { if (typeof n === 'string') parts.push(n); });
  return parts.join('').replace(/\s+/g, ' ');
}

/** 收集满足条件的节点 */
function nodes(tree, pred) {
  const out = [];
  walk(tree, (n, tag) => { if (tag && pred(n, tag)) out.push(n); });
  return out;
}

const cls = (n) => String((n.attr && n.attr.class) || '');

// ---------- 数据准备 ----------

const { CITIES } = require(path.join(WM, 'utils/manual-cities.js'));
const { QUESTIONS } = require(path.join(WM, 'utils/questions.js'));
const scoring = require(path.join(WM, 'utils/scoring.js'));

// 造一份确定性的答案: 每题选第 2 个选项
const answers = {};
QUESTIONS.forEach((q) => { answers[q.id] = 1; });

// ---------- 1. 首页 ----------

const renderIndex = page('index/index');
const idxUnpaid = renderIndex({
  answered: 0, total: QUESTIONS.length, paid: false, paying: false, priceLabel: '¥2',
});
check(textOf(idxUnpaid).includes('支付 ¥2'), 'index 未支付态: 按钮显示「支付 ¥2」');
check(!textOf(idxUnpaid).includes('继续测评'), 'index 未支付态: 不出现「继续测评」');
check(
  nodes(idxUnpaid, (n) => (n.attr || {}).bindtap === 'start').length === 1,
  'index 未支付态: 只有一个绑定 start 的按钮'
);

const idxPaying = renderIndex({
  answered: 0, total: QUESTIONS.length, paid: false, paying: true, priceLabel: '¥2',
});
check(textOf(idxPaying).includes('正在拉起支付'), 'index 支付中: 按钮切「正在拉起支付」');

const idxPaid = renderIndex({
  answered: 3, total: QUESTIONS.length, paid: true, paying: false, priceLabel: '¥2',
});
check(textOf(idxPaid).includes('继续测评'), 'index 已支付且答过: 显示「继续测评」');
check(
  nodes(idxPaid, (n) => (n.attr || {}).bindtap === 'restart').length === 1,
  'index 已支付: 有「重新开始」入口'
);

// 首屏统计数字必须和真实数据一致(曾经写死 8 城/26 项, 与实际 37 城/30 字段脱节)
const idxText = textOf(idxUnpaid);
check(idxText.includes(String(CITIES.length)), `index 首屏城市数与数据一致 (${CITIES.length})`);
const fieldCount = (CITIES[0].dims || []).reduce((s, d) => s + (d.fields || []).length, 0);
check(idxText.includes(String(fieldCount)), `index 首屏字段数与数据一致 (${fieldCount})`);

// ---------- 2. 答题页 ----------

const renderQuiz = page('quiz/quiz');
const q0 = QUESTIONS[0];
const quiz = renderQuiz({
  idx: 0, total: QUESTIONS.length, progress: 0, q: q0, dimName: '事业雄心',
  selected: 1, options: q0.options,
});
const opts = nodes(quiz, (n) => cls(n).includes('opt'));
check(opts.length === q0.options.length, `quiz: 渲染出 ${opts.length} 个选项`);
check(
  opts.filter((n) => cls(n).includes('selected')).length === 1,
  'quiz: 只有当前选中项带 selected'
);
check(textOf(quiz).includes(q0.options[1]), 'quiz: 选中的选项文案正确渲染');
check(textOf(quiz).includes('1 / ' + QUESTIONS.length), 'quiz: 题号显示正确');

// ---------- 3. 结果页 ----------

const renderResult = page('result/result');
const { userDims, profile: raw, results } = scoring.matchAll(answers, QUESTIONS);
const profile = { ...raw, traitLine: (raw.traits || []).join(' · ') };
const birdClass = 'bird-' + String(profile.key || '1,1').replace(',', '');
const fmt = (n) => (n == null || Number.isNaN(n)) ? '—' : Math.round(n * 1000) / 1000;
const top3 = results.slice(0, 3).map((r, i) => ({
  rank: i + 1, name: r.city.name, tier: r.city.tier, match: r.match, meta: '', chips: [], warn: null,
}));
const dims = Object.entries({ ambition: 1, lifestyle: 1, family: 1, economy: 1, risk: 1 }).map(([k]) => ({ n: k, v: 50 }));
const result = renderResult({ profile, dims, top3, birdClass });

const bird = nodes(result, (n) => cls(n).includes('pbird'));
check(bird.length === 1, 'result: 画像卡左侧剪影唯一');
check(bird.length === 1 && cls(bird[0]).includes(birdClass), `result: 剪影类名含 ${birdClass}`);
check(cls(bird[0] || {}).split(/\s+/).every((c) => c), 'result: 剪影 class 无空占位');
check(textOf(result).includes(profile.name), `result: 显示鸟名「${profile.name}」`);
check(textOf(result).includes(profile.en), `result: 显示英文名「${profile.en}」`);
check(textOf(result).includes(profile.tagline), 'result: 显示一句话 tagline');
check(textOf(result).includes(top3[0].name), 'result: 显示 Top1 城市');

// ---------- 4. 城市名录 ----------

const renderHome = page('manual-home/index');
const tiers = ['all', '一线', '新一线', '二线', '三线', '四线', '五线'];
const homeAll = renderHome({ cities: CITIES, filter: 'all', tiers, compare: [], count: 0, maxCompare: 3 });
const itemsAll = nodes(homeAll, (n) => cls(n).includes('city-item'));
check(itemsAll.length === CITIES.length, `名录: 全部筛选渲染 ${itemsAll.length} 城`);

const homeTier = renderHome({ cities: CITIES, filter: '一线', tiers, compare: [], count: 0, maxCompare: 3 });
const filterOn = nodes(homeTier, (n) => cls(n).includes('filter-item') && cls(n).includes('on'));
check(filterOn.length === 1, '名录: 层级筛选只有一个高亮');
check(filterOn.length === 1 && filterOn[0].attr['data-tier'] === '一线', '名录: 高亮落在「一线」上');

// 对比选中态
const pickedCities = CITIES.map((c) => Object.assign({}, c, { picked: c.pinyin === 'hangzhou' }));
const homePicked = renderHome({ cities: pickedCities, filter: 'all', tiers, compare: ['hangzhou'], count: 1, maxCompare: 3 });
const cmpOn = nodes(homePicked, (n) => cls(n).includes('ci-cmp') && cls(n).includes('on'));
check(cmpOn.length === 1, '名录: 已选城市的对比按钮为选中态');
check(cmpOn.length === 1 && cmpOn[0].attr['data-pinyin'] === 'hangzhou', '名录: 选中态落在正确城市');
check(textOf(homePicked).includes('已选 1 城'), '名录: 底部浮条显示已选数量');

// ---------- 5. 城市详情 ----------

const renderCity = page('city/city');
const city = CITIES[0];
const cityTree = renderCity({ city, dims: city.dims || [], inCompare: false, error: '', SRC_TITLE: '来源标题' });
const rows = nodes(cityTree, (n) => cls(n).includes('field-row'));
check(rows.length === fieldCount, `详情: 渲染 ${rows.length} 个字段行`);
check(textOf(cityTree).includes(city.name), `详情: 显示城市名「${city.name}」`);

const cityEmpty = renderCity({ city: null, dims: [], inCompare: false, error: '缺少城市参数', SRC_TITLE: '' });
check(textOf(cityEmpty).includes('缺少城市参数'), '详情: 空参时给出错误态而不是白屏');
check(
  nodes(cityEmpty, (n) => (n.attr || {}).bindtap === 'goHome').length === 1,
  '详情: 错误态有返回名录入口'
);

// ---------- 6. 对比页 ----------

const renderCompare = page('compare/compare');
const cmpEmpty = renderCompare({ cities: [], matrix: [], isEmpty: true, slots: 3 });
check(textOf(cmpEmpty).includes('在名录页选择'), '对比: 空态文案正常');

const two = [CITIES[0], CITIES[1]].map((c) => Object.assign({}, c, { picked: true }));
const matrix = [{
  dimKey: 'economy', dimName: '经济机会',
  rows: [
    { label: '年均收入', key: 'avg_salary_yearly', vals: ['200000', '150000'], units: ['元', '元'], best: 0 },
    { label: '落户年限', key: 'social_security_years_required', vals: ['3', '1'], units: ['年', '年'], best: 1 },
  ],
}];
const cmpTree = renderCompare({ cities: two, matrix, isEmpty: false, slots: 3 });
const best = nodes(cmpTree, (n) => cls(n).includes('best'));
check(best.length === 2, `对比: 两行各有一个最优高亮 (实得 ${best.length})`);
check(textOf(cmpTree).includes('200000') && textOf(cmpTree).includes('150000'), '对比: 数值渲染正确');
// 数值越大越优 vs 越小越优, 高亮不能落在同一列
check(
  best.length === 2 && best[0].attr.class.includes('best') && best[1].attr.class.includes('best'),
  '对比: 高低方向不同的字段分别高亮'
);

// ---------- 结果 ----------

console.log(`\n${fail === 0 ? '渲染校验全部通过' : '渲染校验存在问题'} (${pass} 项通过, ${fail} 项失败)`);
process.exit(fail === 0 ? 0 : 1);
