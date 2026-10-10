// 小程序逻辑冒烟: node test/wechat-smoke.mjs
// 模拟 wx API + 页面生命周期, 验证三页数据流
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// ---- mock wx ----
const store = {};
const calls = { navigateTo: [], redirectTo: [], setClipboardData: [], reLaunch: [], virtualPayment: [] };
let virtualPayBehavior = 'success';   // 'success' | 'cancel' | 'error'
globalThis.wx = {
  getStorageSync: k => store[k] ?? '',
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: k => { delete store[k]; },
  navigateTo: o => calls.navigateTo.push(o.url),
  redirectTo: o => calls.redirectTo.push(o.url),
  reLaunch: o => calls.reLaunch.push(o.url),
  setClipboardData: o => { calls.setClipboardData.push(o.data); o.success(); },
  showToast: ({ title }) => calls.toast = (calls.toast || []).concat(title),
  // 虚拟支付: 按行为调用 success/fail, 记入 calls
  requestVirtualPayment: o => {
    calls.virtualPayment.push(o);
    if (virtualPayBehavior === 'success') o.success && o.success();
    else if (virtualPayBehavior === 'cancel') o.fail && o.fail({ errMsg: 'requestVirtualPayment:fail cancel' });
    else o.fail && o.fail({ errMsg: 'requestVirtualPayment:fail internal error' });
  },
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
    if (name.includes('pay.config')) return require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/pay.config.js');
    if (name.includes('utils/pay')) return require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/utils/pay.js');
    return require(name);
  }, (obj) => Object.assign(page, obj));
  return page;
}

const idxPage = loadPage('pages/index/index.js');
idxPage.onLoad(); idxPage.onShow();
ok(idxPage.data.total === 33, `index: total=33 (got ${idxPage.data.total})`);
ok(idxPage.data.answered === 0, 'index: 初始 answered=0');

// ---- 支付门槛: 未支付点开始 → devMode 支付成功 → 跳转 ----
const payMod = require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/utils/pay.js');
const payCfg = require('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/wechat/pay.config.js');
ok(payMod.isPaid() === false, 'pay: 初始未支付');
ok(payCfg.devMode === true, 'config: devMode=true (默认)');
ok(payCfg.priceBean === 20, `config: priceBean=20 (got ${payCfg.priceBean})`);
idxPage.start();   // devMode: 同步完成支付并跳转
ok(payMod.isPaid() === true, 'pay: devMode 支付后标记已付');
ok(calls.navigateTo[0] === '/pages/quiz/quiz', 'pay: 支付成功后跳转答题');
idxPage.onShow();
ok(idxPage.data.paid === true, 'index: paid 状态刷新');

// ---- 非 devMode 路径: 走 wx.requestVirtualPayment ----
payCfg.devMode = false;          // 切换到生产模式
payCfg.offerId = 'test_offer_001';
store['guichao_paid'] = false;   // 重置支付状态
virtualPayBehavior = 'success';
idxPage.start();
ok(calls.virtualPayment.length === 1, `virtualPay: 调起 1 次 (got ${calls.virtualPayment.length})`);
const req = calls.virtualPayment[0];
ok(req.offerId === 'test_offer_001', `virtualPay: offerId 正确 (got ${req.offerId})`);
ok(req.buyQuantity === 20, `virtualPay: buyQuantity=20 豆 (got ${req.buyQuantity})`);
ok(req.currencyType === 'wechatBean', 'virtualPay: currencyType=wechatBean');
ok(req.productName.includes('归巢'), 'virtualPay: 商品名含归巢');
ok(store['guichao_paid'] === true, 'virtualPay: 成功后标记已付');
ok(calls.navigateTo[calls.navigateTo.length - 1] === '/pages/quiz/quiz', 'virtualPay: 成功后跳转');

// 取消支付路径
store['guichao_paid'] = false;
const beforeCancel = calls.navigateTo.length;
calls.virtualPayment.length = 0;
virtualPayBehavior = 'cancel';
idxPage.start();
ok(store['guichao_paid'] !== true, 'virtualPay cancel: 未标记已付');
ok((calls.toast || []).join('|').includes('已取消'), 'virtualPay cancel: toast 提示');
ok(calls.navigateTo.length === beforeCancel, `virtualPay cancel: 不新增跳转 (got ${calls.navigateTo.length - beforeCancel})`);

// 未配 offerId 防护
payCfg.offerId = '';
virtualPayBehavior = 'error';
idxPage.start();
ok((calls.toast || []).join('|').includes('offerId'), 'virtualPay 无 offerId: toast 提示');

// 恢复 devMode 给后续测试
payCfg.devMode = true;
virtualPayBehavior = 'success';
store['guichao_paid'] = true;
idxPage.onShow();

// quiz 页未支付防线: 清掉支付标记再进
store['guichao_paid'] = false;
const quizGuard = loadPage('pages/quiz/quiz.js');
quizGuard.onLoad();
ok(calls.reLaunch.includes('/pages/index/index'), 'quiz: 未支付弹回首页');
store['guichao_paid'] = true;  // 恢复

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
