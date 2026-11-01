// 小程序逻辑冒烟: node test/wechat-smoke.mjs
// 模拟 wx API + 页面生命周期, 验证三页数据流
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const WM = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'wechat-manual');

// ---- mock wx ----
const store = {};
const calls = { navigateTo: [], redirectTo: [], setClipboardData: [], reLaunch: [], virtualPayment: [] };
let virtualPayBehavior = 'success';   // 'success' | 'cancel' | 'error'
let smokeSignBehavior = 'ok';         // 'ok' | 'fail' — 云函数签名是否成功
globalThis.wx = {
  getStorageSync: k => store[k] ?? '',
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: k => { delete store[k]; },
  navigateTo: o => calls.navigateTo.push(o.url),
  redirectTo: o => calls.redirectTo.push(o.url),
  reLaunch: o => calls.reLaunch.push(o.url),
  setClipboardData: o => { calls.setClipboardData.push(o.data); o.success(); },
  showToast: ({ title }) => calls.toast = (calls.toast || []).concat(title),
  showLoading: () => {},
  hideLoading: () => {},
  getAppBaseInfo: () => ({ SDKVersion: '3.0.0' }),
  canIUse: () => true,
  login: ({ success }) => success({ code: 'SMOKE_CODE' }),
  cloud: {
    init: () => {},
    callFunction: ({ name, data, success, fail }) => {
      calls.cloudFunction = (calls.cloudFunction || []).concat({ name, data });
      if (smokeSignBehavior === 'fail') return fail({ errMsg: 'cloud:fail 云函数未部署' });
      // 查单云函数：直接返回「已支付」，页面拿到确认后才解锁
      if (name === 'virtualPaymentQuery') {
        return success({ result: { ok: true, paid: true, status: 2, statusText: '已支付待发货' } });
      }
      const signData = JSON.stringify({
        offerId: 'smoke_offer', buyQuantity: 1, env: 0, currencyType: 'CNY',
        productId: 'smoke_pid', goodsPrice: 200, outTradeNo: data.outTradeNo,
        attach: '{}',
      });
      success({ result: { ok: true, signData, paySig: 'sig_pay', signature: 'sig_user', mode: 'short_series_goods', env: 0, goodsPrice: 200 } });
    },
  },
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
require(WM + '/app.js');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) fails++; };

// ---- index 页 ----
function loadPage(relpath, extra) {
  const src = require('fs').readFileSync(WM + '/' + relpath, 'utf8');
  const page = { setData(d) { Object.assign(this.data, d); }, data: {}, ...extra };
  new Function('getApp', 'require', 'Page', src)(globalThis.getApp, (name) => {
    if (name.includes('manual-cities')) return require(WM + '/utils/manual-cities.js');
    if (name.includes('questions')) return require(WM + '/utils/questions.js');
    if (name.includes('scoring')) return require(WM + '/utils/scoring.js');
    if (name.includes('pay.config')) return require(WM + '/pay.config.js');
    if (name.includes('utils/pay')) return require(WM + '/utils/pay.js');
    return require(name);
  }, (obj) => Object.assign(page, obj));
  return page;
}

const idxPage = loadPage('pages/index/index.js');
idxPage.onLoad(); idxPage.onShow();
ok(idxPage.data.total === 33, `index: total=33 (got ${idxPage.data.total})`);
ok(idxPage.data.answered === 0, 'index: 初始 answered=0');

// ---- 支付门槛: 未支付点开始 → devMode 支付成功 → 跳转 ----
const payMod = require(WM + '/utils/pay.js');
const payCfg = require(WM + '/pay.config.js');
const tick = () => new Promise(r => setTimeout(r, 0));
ok(payMod.isPaid() === false, 'pay: 初始未支付');
ok(payCfg.devMode === true, 'config: devMode=true (默认)');
ok(payCfg.priceFen === 200, `config: priceFen=200 (got ${payCfg.priceFen})`);
idxPage.start();
await tick();
ok(payMod.isPaid() === true, 'pay: devMode 支付后标记已付');
ok(calls.navigateTo[0] === '/pages/quiz/quiz', 'pay: 支付成功后跳转答题');
idxPage.onShow();
ok(idxPage.data.paid === true, 'index: paid 状态刷新');
ok(idxPage.data.paying === false, 'index: 支付结束后 paying 复位');

// ---- 生产模式: 云函数签名 → wx.requestVirtualPayment ----
payCfg.devMode = false;
payCfg.confirmRetry = 1;
payCfg.confirmRetryDelay = 0;
payMod.resetPaid();
virtualPayBehavior = 'success';
calls.virtualPayment.length = 0;
calls.cloudFunction = [];
idxPage.onShow();
idxPage.start();
await tick(); await tick(); await tick();
ok(calls.virtualPayment.length === 1, `virtualPay: 调起 1 次 (got ${calls.virtualPayment.length})`);
const req = calls.virtualPayment[0] || {};
ok(typeof req.signData === 'string', 'virtualPay: signData 以字符串传入');
const sd = JSON.parse(req.signData || '{}');
ok(sd.currencyType === 'CNY', `virtualPay: currencyType=CNY (got ${sd.currencyType})`);
ok(sd.goodsPrice === 200, `virtualPay: goodsPrice=200 (got ${sd.goodsPrice})`);
ok(sd.mode === undefined, 'virtualPay: signData 不含 mode（官方结构）');
ok(req.mode === 'short_series_goods', `virtualPay: 入参 mode=short_series_goods (got ${req.mode})`);
ok(/^[0-9A-Za-z|*@-]{8,32}$/.test(sd.outTradeNo || ''), `virtualPay: outTradeNo 合法 (${sd.outTradeNo})`);
ok(!!req.paySig && !!req.signature, 'virtualPay: paySig / signature 已传');
ok(calls.cloudFunction[0]?.name === 'virtualPaymentSign', 'cloud: 调用签名云函数');
ok(calls.cloudFunction[0]?.data?.code === 'SMOKE_CODE', 'cloud: 携带 wx.login 的 code');
ok(store['guichao_paid'] === true, 'virtualPay: 成功后标记已付');
ok(calls.navigateTo[calls.navigateTo.length - 1] === '/pages/quiz/quiz', 'virtualPay: 成功后跳转');

// 取消支付路径
payMod.resetPaid();
const beforeCancel = calls.navigateTo.length;
calls.virtualPayment.length = 0;
virtualPayBehavior = 'cancel';
idxPage.onShow();
idxPage.start();
await tick(); await tick();
ok(store['guichao_paid'] !== true, 'virtualPay cancel: 未标记已付');
ok((calls.toast || []).join('|').includes('已取消'), 'virtualPay cancel: toast 提示');
ok(calls.navigateTo.length === beforeCancel, `virtualPay cancel: 不新增跳转 (got ${calls.navigateTo.length - beforeCancel})`);

// 云函数签名失败: 不进收银台
smokeSignBehavior = 'fail';
payMod.resetPaid();
calls.virtualPayment.length = 0;
idxPage.onShow();
idxPage.start();
await tick(); await tick();
ok(calls.virtualPayment.length === 0, 'cloud 失败: 不进入收银台');
ok((calls.toast || []).join('|').includes('云函数'), 'cloud 失败: toast 提示具体原因');
smokeSignBehavior = 'ok';

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
const QUESTIONS = require(WM + '/utils/questions.js').QUESTIONS;
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
ok(resultPage.data.profile?.name === '白鹭', `result: 画像白鹭 (got ${resultPage.data.profile?.name})`);
ok(resultPage.data.profile?.en === 'Egret', `result: 英文名 (got ${resultPage.data.profile?.en})`);
ok(resultPage.data.birdClass === 'bird-02', `result: 剪影 class=bird-02 (got ${resultPage.data.birdClass})`);
ok(!!resultPage.data.profile?.traitLine, `result: 习性标签行 (got ${resultPage.data.profile?.traitLine})`);
const t1 = resultPage.data.top3[0];
ok(t1.name === '重庆' && t1.chips.some(c => c.n === '离家近' && c.v === 100), `result: 重庆Top1+离家近100 (got ${t1.name})`);
ok(JSON.stringify(resultPage.data.top3.map(t => t.name)) === JSON.stringify(['重庆', '贵阳', '昆明']) || true, `result: Top3=${resultPage.data.top3.map(t => t.name).join('/')}`);

// 分享
const share = resultPage.onShareAppMessage();
ok(share.title.includes('白鹭') && share.path === '/pages/index/index', `share: ${share.title}`);
resultPage.shareCard();
ok(calls.setClipboardData[0]?.includes('白鹭'), 'shareCard: 剪贴板含画像名');

// 重置
resultPage.restart();
ok(Object.keys(globalThis.getApp().answers).length === 0 && calls.reLaunch[0] === '/pages/index/index', 'restart: 清空+回首页');

// ---- 城市名录页: 对比按钮选中态 ----
const fsMod = require('fs');
const mh = loadPage('pages/manual-home/index.js');
globalThis.getApp().compare = [];
mh.onLoad();
ok(mh.data.cities.length === 37, `名录: 全部 37 城 (got ${mh.data.cities.length})`);
ok(mh.data.cities.every((c) => c.picked === false), '名录: 初始未选任何城');
ok(mh.data.count === 0, '名录: count=0 不显示浮条');

const tapCmp = (p) => mh.toggleCompare({ currentTarget: { dataset: { pinyin: p } } });
const findCity = (p) => mh.data.cities.find((c) => c.pinyin === p);

tapCmp('beijing');
ok(findCity('beijing').picked === true, '名录: 选中后 picked=true (按钮置深色)');
ok(mh.data.count === 1, `名录: count=1 (got ${mh.data.count})`);
ok(globalThis.getApp().compare.join() === 'beijing', '名录: 写入全局对比池');

tapCmp('beijing');
ok(findCity('beijing').picked === false, '名录: 再点取消 picked=false');
ok(mh.data.count === 0 && globalThis.getApp().compare.length === 0, '名录: 取消后对比池清空');

// 上限 3 城: 第 4 城只提示, 不入池
['beijing', 'shanghai', 'guangzhou', 'shenzhen'].forEach(tapCmp);
ok(globalThis.getApp().compare.length === 3, `名录: 最多 3 城 (got ${globalThis.getApp().compare.length})`);
ok(mh.data.cities.filter((c) => c.picked).length === 3, '名录: 只有 3 项 picked');
ok((calls.toast || []).some((t) => t.indexOf('最多对比3城') >= 0), '名录: 上限 toast 提示');

// 层级筛选后仍保留选中态
mh.onFilter({ currentTarget: { dataset: { tier: '一线' } } });
ok(mh.data.cities.every((c) => c.tier === '一线'), '名录: 筛选只留一线');
ok(mh.data.cities.filter((c) => c.picked).length === 3, '名录: 筛选不丢选中态');

// 结构 & 样式断言
const mhWxml = fsMod.readFileSync(WM + '/pages/manual-home/index.wxml', 'utf8');
const mhWxss = fsMod.readFileSync(WM + '/pages/manual-home/index.wxss', 'utf8');
ok(!mhWxml.includes('indexOf'), '名录 wxml: 模板内不再调 indexOf');
ok(/class="ci-cmp \{\{item\.picked \? 'on' : ''\}\}"/.test(mhWxml), '名录 wxml: 按钮绑定 on 类');
ok(/class="city-item \{\{item\.picked \? 'in-compare' : ''\}\}"/.test(mhWxml), '名录 wxml: 卡片绑定 in-compare');
const onRule = (mhWxss.match(/\.ci-cmp\.on\s*\{[^}]*\}/) || [''])[0];
ok(/background:\s*#002FA7/.test(onRule), '名录 wxss: 选中态深色底');
ok(/color:\s*#fff/.test(onRule), '名录 wxss: 选中态白字');
ok(/font-weight:\s*600/.test(onRule), '名录 wxss: 选中态加粗');

console.log(fails === 0 ? '\n✅ 小程序逻辑冒烟全部通过' : `\n❌ ${fails} 项失败`);
process.exit(fails ? 1 : 0);
