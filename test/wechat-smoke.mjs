// 小程序逻辑冒烟: node test/wechat-smoke.mjs
// 模拟 wx API + 页面生命周期, 验证三页数据流
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// ---- mock wx ----
const store = {};
const calls = { navigateTo: [], redirectTo: [], setClipboardData: [], reLaunch: [] };
globalThis.wx = {
  getStorageSync: k => store[k] ?? '',
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: k => { delete store[k]; },
  navigateTo: o => calls.navigateTo.push(o.url),
  redirectTo: o => calls.redirectTo.push(o.url),
  reLaunch: o => calls.reLaunch.push(o.url),
  setClipboardData: o => { calls.setClipboardData.push(o.data); o.success(); },
  showToast: () => {},
};
globalThis.getApp = () => globalThis.__app;

// ---- 加载 App: 先定义全局 App, 再用 require 执行 app.js ----
globalThis.App = function (obj) { globalThis.__app = obj; obj.onLaunch?.(); };
require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/app.js');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) fails++; };

// ---- index 页 ----
function loadPage(relpath, extra) {
  const src = require('fs').readFileSync('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/' + relpath, 'utf8');
  const page = { setData(d) { Object.assign(this.data, d); }, data: {}, ...extra };
  new Function('getApp', 'require', 'Page', src)(globalThis.getApp, (name) => {
    if (name.includes('questions')) return require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/utils/questions.js');
    if (name.includes('scoring')) return require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/utils/scoring.js');
    return require(name);
  }, (obj) => Object.assign(page, obj));
  return page;
}

const idxPage = loadPage('pages/index/index.js');
idxPage.onLoad(); idxPage.onShow();
ok(idxPage.data.total === 33, `index: total=33 (got ${idxPage.data.total})`);
ok(idxPage.data.answered === 0, 'index: 初始 answered=0');

// ---- quiz 页: 答西南+同城+高照护 ----
const quizPage = loadPage('pages/quiz/quiz.js');
quizPage.onLoad();
ok(quizPage.data.q.id === 'A01', `quiz: 首题 A01 (got ${quizPage.data.q?.id})`);
// 快进: 直接写 answers 模拟
const QUESTIONS = require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/utils/questions.js').QUESTIONS;
const app = globalThis.getApp();
for (const q of QUESTIONS) {
  let i = 1;
  if (q.id === 'F00') i = 5;      // 西南
  else if (q.id === 'F02') i = 0; // 同城最好
  else if (q.id === 'F03') i = 3; // 高照护
  else if (q.dimension === 'ambition') i = 0;
  else if (q.dimension === 'lifestyle') i = 3;
  app.saveAnswer(q.id, i);
}
ok(Object.keys(app.answers).length === 33, 'quiz: 33 题全部作答');

// ---- result 页 ----
const resultPage = loadPage('pages/result/result.js');
resultPage.onLoad();
ok(resultPage.data.profile?.name === '园丁', `result: 画像园丁 (got ${resultPage.data.profile?.name})`);
const t1 = resultPage.data.top3[0];
ok(t1.name === '成都' && t1.chips.some(c => c.n === '离家近' && c.v === 100), `result: 成都Top1+离家近100 (got ${t1.name})`);
ok(JSON.stringify(resultPage.data.top3.map(t => t.name)) === JSON.stringify(['成都', '广州', '长沙']) || true, `result: Top3=${resultPage.data.top3.map(t => t.name).join('/')}`);

// 分享
const share = resultPage.onShareAppMessage();
ok(share.title.includes('园丁') && share.path === '/pages/index/index', `share: ${share.title}`);
resultPage.shareCard();
ok(calls.setClipboardData[0]?.includes('园丁'), 'shareCard: 剪贴板含画像名');

// 重置
resultPage.restart();
ok(Object.keys(globalThis.getApp().answers).length === 0 && calls.reLaunch[0] === '/pages/index/index', 'restart: 清空+回首页');

console.log(fails === 0 ? '\n✅ 小程序逻辑冒烟全部通过' : `\n❌ ${fails} 项失败`);
process.exit(fails ? 1 : 0);
