// 支付封装行为测试: node test/pay-smoke.cjs (CJS — utils/pay.js 是 CommonJS)
// 全程 mock wx: 不触网、不依赖真机/云开发，只校验分支逻辑与入参契约
const path = require('node:path');

const PAY = path.join(__dirname, '..', 'wechat-manual', 'utils', 'pay.js');
const CFG = path.join(__dirname, '..', 'wechat-manual', 'pay.config.js');

let pass = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log('✅', msg); } else { fail++; console.log('❌', msg); }
};
const tick = () => new Promise((r) => setTimeout(r, 0));

/** 造一个 wx 替身；behavior 控制支付回调走向 */
function makeWx(behavior) {
  const seen = { toasts: [], modals: [], calls: [], stored: {} };
  const wx = {
    getStorageSync: (k) => (k in seen.stored ? seen.stored[k] : ''),
    setStorageSync: (k, v) => { seen.stored[k] = v; },
    removeStorageSync: (k) => { delete seen.stored[k]; },
    showToast: ({ title }) => seen.toasts.push(title),
    showModal: (o) => seen.modals.push(o),
    showLoading: () => {},
    hideLoading: () => {},
    getAppBaseInfo: () => ({ SDKVersion: seen.sdk || '3.0.0' }),
    getSystemInfoSync: () => ({
      SDKVersion: seen.sdk || '3.0.0',
      platform: seen.platform || 'android',
      version: seen.wxVersion || '8.0.90',
    }),
    canIUse: (api) => (seen.canIUse || false) && api === 'requestVirtualPayment',
    login: ({ success, fail }) => (seen.loginFail ? fail({ errMsg: 'login:fail' }) : success({ code: 'CODE_123' })),
    cloud: {
      init: (o) => seen.calls.push({ api: 'cloud.init', opts: o }),
      callFunction: ({ name, data, success, fail }) => {
        seen.calls.push({ api: 'cloud.callFunction', name, data });
        if (seen.signFail && name === 'virtualPaymentSign') {
          fail({ errMsg: 'cloud:fail 云函数未部署' });
          return;
        }
        // 查单云函数默认返回「已支付」，可用 queryResult 覆盖成未支付/报错
        const result =
          name === 'virtualPaymentQuery'
            ? (seen.queryResult || { ok: true, paid: true, status: 2, statusText: '已支付待发货' })
            : (seen.signResult || {
                ok: false, code: 'NO_CONFIG', msg: '云函数 config.js 未填 offerId / productId',
              });
        success({ result });
      },
    },
    requestVirtualPayment: (o) => {
      seen.calls.push({ api: 'requestVirtualPayment', params: o });
      behavior(o);
    },
  };
  seen.wx = wx;
  return seen;
}

/** 载入一份干净的 pay.js，并把 pay.config.js 覆盖成指定值 */
function loadPay(overrides, mock) {
  delete require.cache[PAY];
  delete require.cache[CFG];
  global.wx = mock.wx;
  const cfg = require(CFG);
  Object.assign(cfg, overrides);
  return require(PAY);
}

const SIGN_OK = {
  ok: true,
  // 官方 signData 结构：不含 mode（mode 是入参的兄弟字段）
  signData: JSON.stringify({
    offerId: 'of_1', buyQuantity: 1, env: 0, currencyType: 'CNY', productId: 'p_1',
    goodsPrice: 200, outTradeNo: 'GC20261101000000ABCDEF', attach: '{}',
  }),
  paySig: 'paysig_mock',
  signature: 'signature_mock',
  mode: 'short_series_goods',
  env: 0,
  goodsPrice: 200,
  outTradeNo: 'GC20261101000000ABCDEF',
};

const FAST_CONFIRM = { confirmRetry: 1, confirmRetryDelay: 0 };

(async () => {
  // ---- 1. devMode: 不触网直接解锁 ----
  {
    const m = makeWx(() => {});
    const pay = loadPay({ devMode: true }, m);
    let got = null;
    pay.pay((ok) => (got = ok));
    await tick();
    console.log('\n[1] devMode 假支付');
    check(got === true, 'devMode 下直接回调 true');
    check(pay.isPaid() === true, '写入已解锁标记');
    check(m.calls.length === 0, '未调用云函数/支付接口');
    check(pay.orders().length === 1 && pay.orders()[0].mock === true, '订单流水标记为 mock');
    pay.resetPaid();
    check(pay.isPaid() === false, 'resetPaid 可复原到未支付（调试用）');
  }

  // ---- 2. 基础库过低 ----
  {
    const m = makeWx(() => {});
    m.sdk = '2.0.0';
    const pay = loadPay({ devMode: false }, m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick();
    console.log('\n[2] 基础库低于 2.19.2');
    check(got && got.ok === false && got.detail.errCode === 'LOW_LIB', '拦在调起支付之前');
    check(m.toasts.some((t) => t.indexOf('微信版本过低') >= 0), '提示升级微信');
    check(m.calls.length === 0, '未发起任何支付调用');
  }

  // ---- 3. 云函数下单失败（未配置 offerId）----
  {
    const m = makeWx(() => {});
    const pay = loadPay({ devMode: false }, m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick();
    await tick();
    console.log('\n[3] 云函数未配置');
    check(!!got && got.ok === false && got.detail.errCode === 'SIGN_FAIL', '下单失败不进入收银台');
    check(!!got && String(got.detail.errMsg).indexOf('offerId') >= 0, '把云函数的具体原因透出给用户');
    check(pay.isPaid() === false, '失败不误标记已支付');
    const cf = m.calls.find((c) => c.api === 'cloud.callFunction');
    check(!!cf && cf.data.code === 'CODE_123' && !!cf.data.outTradeNo, '云函数入参带 code + outTradeNo');
  }

  // ---- 4. 支付成功（服务端查单确认已支付）----
  {
    const m = makeWx((o) => o.success({ errMsg: 'requestVirtualPayment:ok' }));
    m.signResult = SIGN_OK;
    const pay = loadPay(Object.assign({ devMode: false }, FAST_CONFIRM), m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick(); await tick(); await tick();
    console.log('\n[4] 支付成功');
    check(!!got && got.ok === true, '回调 true');
    check(pay.isPaid() === true, '标记已解锁');
    const call = m.calls.find((c) => c.api === 'requestVirtualPayment');
    check(!!call, '调起 requestVirtualPayment');
    const p = (call && call.params) || {};
    check(typeof p.signData === 'string', 'signData 以字符串传入（传对象会 -15016）');
    check(p.signData === SIGN_OK.signData, 'signData 原样透传，未二次序列化');
    check(p.paySig === SIGN_OK.paySig && p.signature === SIGN_OK.signature, 'paySig / signature 透传');
    check(p.mode === 'short_series_goods', 'mode 已传');
    check(pay.orders()[0].outTradeNo === JSON.parse(p.signData).outTradeNo, '本地流水记录订单号');
    const q = m.calls.find((c) => c.api === 'cloud.callFunction' && c.name === 'virtualPaymentQuery');
    check(!!q && q.data.outTradeNo === JSON.parse(p.signData).outTradeNo, '支付后向服务端查单确认');
    check(pay.orders()[0].confirmed === true && !pay.orders()[0].pending, '确认已支付才标记 confirmed');
  }

  // ---- 5. 用户取消 ----
  {
    const m = makeWx((o) => o.fail({ errMsg: 'requestVirtualPayment:fail cancel', errCode: -2 }));
    m.signResult = SIGN_OK;
    const pay = loadPay({ devMode: false }, m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick();
    await tick();
    console.log('\n[5] 用户取消支付');
    check(!!got && got.ok === false && got.detail.errCode === -2, '回调 false + 错误码 -2');
    check(m.toasts.indexOf('已取消支付') >= 0, '中文提示已取消');
    check(pay.isPaid() === false, '不标记已解锁');
  }

  // ---- 6. 签名错误码映射 ----
  {
    const m = makeWx((o) => o.fail({ errMsg: 'requestVirtualPayment:fail', errCode: -15006 }));
    m.signResult = SIGN_OK;
    const pay = loadPay({ devMode: false }, m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick();
    await tick();
    console.log('\n[6] 签名错误 -15006');
    check(!!got && /支付签名/.test(got.detail.text), '错误码翻译成可读文案');
  }

  // ---- 7. outTradeNo 规则 ----
  {
    const m = makeWx(() => {});
    const pay = loadPay({ devMode: true }, m);
    const a = pay.newOutTradeNo();
    const b = pay.newOutTradeNo();
    console.log('\n[7] 订单号生成');
    check(a.length >= 8 && a.length <= 32, `长度合法 (${a.length})`);
    check(/^[0-9A-Za-z|*@-]+$/.test(a), '只含允许字符');
    check(a[0] !== '_', '不以下划线开头');
    check(a !== b, '两次生成不重复');
  }

  // ---- 8. iOS 微信客户端版本门槛（官方要求 8.0.68+）----
  {
    const m = makeWx(() => {});
    m.platform = 'ios';
    m.wxVersion = '8.0.60';
    const pay = loadPay(Object.assign({ devMode: false }, FAST_CONFIRM), m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick();
    console.log('\n[8] iOS 微信版本过低');
    check(!!got && got.ok === false && got.detail.errCode === 'LOW_WX', '拦在调起支付之前');
    check(m.modals.some((o) => /8\.0\.68/.test(o.content || '')), '弹窗提示升级到 8.0.68');
    check(m.calls.length === 0, '未发起云函数/支付调用');
  }

  // ---- 8b. iOS 版本达标则放行 ----
  {
    const m = makeWx((o) => o.success({ errMsg: 'requestVirtualPayment:ok' }));
    m.platform = 'ios';
    m.wxVersion = '8.0.70';
    m.signResult = SIGN_OK;
    const pay = loadPay(Object.assign({ devMode: false }, FAST_CONFIRM), m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick(); await tick(); await tick();
    console.log('\n[8b] iOS 微信版本达标');
    check(!!got && got.ok === true, '正常拉起支付并成功');
    check(!!m.calls.find((c) => c.api === 'requestVirtualPayment'), '调起了收银台');
  }

  // ---- 9. 前端成功但查单说未支付：先解锁 + 标 pending，等待补偿 ----
  {
    const m = makeWx((o) => o.success({ errMsg: 'requestVirtualPayment:ok' }));
    m.signResult = SIGN_OK;
    m.queryResult = { ok: true, paid: false, status: 1 };
    const pay = loadPay(Object.assign({ devMode: false }, FAST_CONFIRM), m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick(); await tick(); await tick();
    console.log('\n[9] 查单未确认（平台延迟）');
    check(!!got && got.ok === true, '不打断用户，先解锁');
    check(!!got && got.detail.pending === true, 'detail 标记 pending');
    check(pay.orders()[0].pending === true, '流水记 pending，供下次补确认');
    check(m.toasts.some((t) => /稍后自动到账/.test(t)), '提示权益稍后到账');
    check(pay.pendingOrders().length === 1, 'pendingOrders() 能捞出待确认单');

    // 补确认：下一次进页面查单已支付 → 清掉 pending
    m.queryResult = { ok: true, paid: true, status: 2 };
    pay.syncPending();
    await tick(); await tick();
    check(pay.pendingOrders().length === 0, 'syncPending 补齐后不再 pending');
    check(pay.isPaid() === true, '仍保持已解锁');
  }

  // ---- 10. 查单云函数异常：同样降级为 pending，不误判未付款 ----
  {
    const m = makeWx((o) => o.success({ errMsg: 'requestVirtualPayment:ok' }));
    m.signResult = SIGN_OK;
    m.queryResult = { ok: false, code: 'NO_CONFIG', msg: 'virtualPaymentQuery/config.js 未填 appSecret' };
    const pay = loadPay(Object.assign({ devMode: false }, FAST_CONFIRM), m);
    let got = null;
    pay.pay((ok, detail) => (got = { ok, detail }));
    await tick(); await tick(); await tick();
    console.log('\n[10] 查单云函数异常');
    check(!!got && got.ok === true && got.detail.pending === true, '降级为 pending 而不是失败');
    check(/appSecret/.test(pay.orders()[0].confirmErr || ''), '把查单失败原因记在流水里');
  }

  // ---- 11. 云函数工程完整性（部署前就能发现的坑）----
  {
    const fs = require('node:fs');
    const root = path.join(__dirname, '..', 'wechat-manual', 'cloudfunctions');
    const fns = ['virtualPaymentSign', 'virtualPaymentQuery', 'virtualPaymentNotify'];
    console.log('\n[11] 云函数工程完整性');
    fns.forEach((n) => {
      check(fs.existsSync(path.join(root, n, 'index.js')), n + ' 有 index.js');
      check(fs.existsSync(path.join(root, n, 'package.json')), n + ' 有 package.json（部署时装依赖）');
    });
    const perm = JSON.parse(fs.readFileSync(path.join(root, 'virtualPaymentSign', 'config.json'), 'utf8'));
    check(
      (perm.permissions && perm.permissions.openapi || []).indexOf('auth.code2Session') >= 0,
      'virtualPaymentSign 声明了 auth.code2Session 云调用权限'
    );
    const trig = JSON.parse(fs.readFileSync(path.join(root, 'virtualPaymentQuery', 'config.json'), 'utf8'));
    check(!!(trig.triggers && trig.triggers.length), 'virtualPaymentQuery 配了定时兜底触发器');
    const cfgSrc = fs.readFileSync(path.join(__dirname, '..', 'wechat-manual', 'pay.config.js'), 'utf8');
    check(!/个人主体没有虚拟支付权限/.test(cfgSrc), '配置注释已按「个人主体可开通」修正');
  }

  console.log(fail === 0 ? `\n全部通过 (${pass} 项)` : `\n${fail} 项失败 / ${pass} 项通过`);
  process.exit(fail === 0 ? 0 : 1);
})();
