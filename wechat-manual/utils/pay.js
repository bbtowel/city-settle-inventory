// 支付封装 — 微信虚拟支付（米大师 / wx.requestVirtualPayment）
//
// 个人主体小程序同样走这套 API（微信 2026-08 开放「虚拟支付:个人」），
// 差别只在开通入口、限额（月 10 万）与费率（Android 1% / iOS 12%），见 docs/personal-payment-guide.md。
//
// 关键事实（与老版本写法不同，别照抄网上旧文章）：
//   - signData 必须是「字符串」，且前端不得改写/重新序列化，否则签名对不上（-15016）
//   - paySig   = hex(hmac_sha256(appKey, 'requestVirtualPayment&' + signData))
//   - signature= hex(hmac_sha256(sessionKey, signData))
//     appKey / sessionKey 都拿不到（前者是后台密钥，后者只能服务端换），所以签名必须放云函数
//   - 基础库 >= 2.19.2；iOS 端还需微信客户端 8.0.68+，且由 Apple 收款（佣金 12%）
//   - 前端 success 回调可能丢失、也可能被改包伪造 → 解锁以服务端查单/发货推送为准
const config = require('../pay.config.js');

const PAID_KEY = 'guichao_paid';
const ORDER_KEY = 'guichao_pay_orders';
const MIN_LIB = '2.19.2';

// 官方错误码 → 人话（- 开头是虚拟支付专有码）
const ERR_TEXT = {
  '-1': '支付失败，请重试',
  '-2': '已取消支付',
  '-4': '支付被风控拦截，请稍后再试',
  '-5': '支付结果未知，请稍后重试',
  '-15001': '下单参数有误',
  '-15002': '订单号重复，请重试',
  '-15003': '系统繁忙，请稍后再试',
  '-15004': '币种配置错误（仅支持 CNY）',
  '-15005': '用户态签名校验失败，请重试',
  '-15006': '支付签名校验失败，请重试',
  '-15007': '登录态已过期，请重试',
  '-15008': '支付账号进件未完成，暂无法收款',
  '-15009': '道具未发布',
  '-15010': '道具 ID 未发布',
  '-15011': '现网版本不能用沙箱环境（env 需为 0）',
  '-15012': '调用米大师失败导致关单，请重试',
  '-15013': '道具价格与后台不一致',
  '-15014': '道具发布未生效，约 10 分钟后可用',
  '-15016': 'signData 格式有误',
  '-15017': '收款功能被限制，请到后台查看原因',
  '-15018': '道具审核未通过',
  '-15019': '账号受限，请到后台查看原因',
  '-15020': '操作过快，请稍候再试',
  '-15021': '交易被限频，请稍后再试（个人主体月限额 10 万元）',
};

function isPaid() {
  return wx.getStorageSync(PAID_KEY) === true;
}

/**
 * devMode 是否真的生效。
 *
 * devMode 只是本地联调开关（点了直接解锁、不扣钱）。一旦代码上传成体验版/正式版，
 * 忘了关就会让所有用户白拿 —— 这种事故排查成本极高，所以这里用 envVersion 再兜一层：
 * 只要不是开发版，devMode 一律失效，强制走真实支付。
 */
function devModeActive() {
  if (!config.devMode) return false;
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync();
    const env = info && info.miniProgram && info.miniProgram.envVersion;
    if (env === 'trial' || env === 'release') {
      console.error('[pay] pay.config.js 的 devMode=true 在 ' + env + ' 环境已忽略，改走真实支付');
      return false;
    }
  } catch (e) {
    // 取不到环境信息（旧基础库）时按开发环境处理
  }
  return true;
}

/** 记账：本地订单流水只留最近 20 条，方便自测与对账 */
function markPaid(order) {
  wx.setStorageSync(PAID_KEY, true);
  try {
    const list = wx.getStorageSync(ORDER_KEY) || [];
    list.unshift(Object.assign({ at: Date.now() }, order || {}));
    wx.setStorageSync(ORDER_KEY, list.slice(0, 20));
  } catch (e) {
    // 存储异常不影响支付主流程
  }
}

/** 调试用：清掉解锁态，回到未支付 */
function resetPaid() {
  wx.removeStorageSync(PAID_KEY);
  wx.removeStorageSync(ORDER_KEY);
}

function orders() {
  return wx.getStorageSync(ORDER_KEY) || [];
}

/** 待服务端确认的订单（支付成功但查单没跟上，下次进页面自动补确认） */
function pendingOrders() {
  return orders().filter((o) => o && o.pending && o.outTradeNo);
}

function errText(errCode, errMsg) {
  if (ERR_TEXT[String(errCode)]) return ERR_TEXT[String(errCode)];
  if (errMsg && /cancel/i.test(errMsg)) return ERR_TEXT['-2'];
  return '支付失败：' + (errMsg || '未知错误');
}

function compareVersion(v1, v2) {
  const a = String(v1).split('.');
  const b = String(v2).split('.');
  const len = Math.max(a.length, b.length);
  while (a.length < len) a.push('0');
  while (b.length < len) b.push('0');
  for (let i = 0; i < len; i++) {
    const n1 = parseInt(a[i], 10) || 0;
    const n2 = parseInt(b[i], 10) || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

function sysInfo() {
  try {
    if (wx.getSystemInfoSync) return wx.getSystemInfoSync() || {};
  } catch (e) {
    // 取不到就当作非 iOS
  }
  return {};
}

/** 基础库与能力检查（官方建议：>= 2.19.2 或 canIUse） */
function canPay() {
  let sdk = '0';
  try {
    sdk = (wx.getAppBaseInfo ? wx.getAppBaseInfo() : sysInfo()).SDKVersion || '0';
  } catch (e) {
    sdk = '0';
  }
  if (compareVersion(sdk, MIN_LIB) >= 0) return true;
  return !!(wx.canIUse && wx.canIUse('requestVirtualPayment'));
}

/**
 * iOS 端微信客户端版本门槛（官方要求 8.0.68+，与基础库无关）。
 * 不满足时直接弹窗拦下，比让 requestVirtualPayment 报 -1 更好排查。
 */
function checkIosWx() {
  const sys = sysInfo();
  const platform = String(sys.platform || sys.system || '').toLowerCase();
  if (platform.indexOf('ios') < 0) return true;
  if (compareVersion(sys.version || '0', config.iosMinWx || '8.0.68') >= 0) return true;
  wx.showModal({
    title: '请先升级微信',
    content: 'iOS 端支付需要微信 ' + (config.iosMinWx || '8.0.68') + ' 及以上版本，请升级后再试',
    showCancel: false,
  });
  return false;
}

/** outTradeNo：8-32 位，只能数字/字母/-|*@，不能以下划线开头，每次下单必须换新 */
function newOutTradeNo() {
  const d = new Date();
  const p = (n, len) => {
    let s = String(n);
    while (s.length < (len || 2)) s = '0' + s;
    return s;
  };
  const stamp =
    d.getFullYear() +
    p(d.getMonth() + 1) + p(d.getDate()) +
    p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  const rand = p(Math.floor(Math.random() * 1000000), 6);
  return 'GC' + stamp + rand;   // 2 + 14 + 6 = 22 位
}

let cloudReady = false;
function ensureCloud() {
  if (cloudReady || !wx.cloud) return !!wx.cloud;
  const opts = { traceUser: true };
  if (config.cloudEnv) opts.env = config.cloudEnv;
  wx.cloud.init(opts);
  cloudReady = true;
  return true;
}

/** 统一云函数调用：resolve 云函数的 result，失败 reject Error */
function callFn(name, data) {
  return new Promise((resolve, reject) => {
    if (!ensureCloud()) {
      reject(new Error('未开通云开发，无法完成支付'));
      return;
    }
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve((res && res.result) || {}),
      fail: (e) => reject(new Error((e && e.errMsg) || '云函数调用失败')),
    });
  });
}

/** 调云函数换签名。signData 由云函数生成原文，前端原样回传，保证前后一致 */
function fetchSign(code, outTradeNo) {
  return callFn(config.signFunction, { code, outTradeNo, env: config.env }).then((r) => {
    if (!r.ok) throw new Error(r.msg || '下单失败');
    return r;
  });
}

/** 服务端查单：以 xpay/query_order 为准，返回 { paid, status } */
function confirmOrder(outTradeNo) {
  return callFn(config.confirmFunction, { outTradeNo }).then((r) => {
    if (!r.ok) throw new Error(r.msg || '查单失败');
    return { paid: r.paid === true, status: r.status };
  });
}

/** 查单重试：刚支付完平台侧可能有秒级延迟 */
function confirmWithRetry(outTradeNo, tries) {
  const max = typeof tries === 'number' ? tries : (config.confirmRetry || 1);
  const gap = typeof config.confirmRetryDelay === 'number' ? config.confirmRetryDelay : 700;
  const step = (n) =>
    confirmOrder(outTradeNo).then((r) => {
      if (r.paid) return r;
      if (n + 1 >= max) return r;
      return new Promise((resolve) => setTimeout(resolve, gap)).then(() => step(n + 1));
    });
  return step(0);
}

/**
 * 补确认：处理「支付成功但当时查单没跟上」的订单。
 * 静默执行，成功就把 pending 抹掉，失败留到下次。
 */
function syncPending() {
  const list = pendingOrders();
  if (!list.length || !config.strictServerConfirm) return;
  list.slice(0, 3).forEach((o) => {
    confirmOrder(o.outTradeNo)
      .then((r) => {
        if (!r.paid) return;
        const next = orders().map((x) =>
          x.outTradeNo === o.outTradeNo ? Object.assign({}, x, { pending: false, syncedAt: Date.now() }) : x
        );
        wx.setStorageSync(ORDER_KEY, next);
      })
      .catch(() => {});
  });
}

/**
 * 拉起支付。cb(ok, detail)。
 * devMode=true 时不触网、不调支付 API，直接解锁（本地联调 UI 用）。
 */
function pay(cb) {
  cb = cb || function () {};

  if (devModeActive()) {
    markPaid({ mock: true, outTradeNo: 'DEV' + Date.now() });
    cb(true, { mock: true });
    return;
  }

  if (!canPay()) {
    wx.showToast({ title: config.lowVersionTip, icon: 'none' });
    cb(false, { errCode: 'LOW_LIB' });
    return;
  }

  if (!checkIosWx()) {
    cb(false, { errCode: 'LOW_WX' });
    return;
  }

  const outTradeNo = newOutTradeNo();
  wx.showLoading({ title: '正在下单…', mask: true });

  wx.login({
    success: ({ code }) => {
      if (!code) {
        wx.hideLoading();
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
        cb(false, { errCode: 'NO_CODE' });
        return;
      }
      fetchSign(code, outTradeNo)
        .then((sign) => {
          wx.hideLoading();
          wx.requestVirtualPayment({
            signData: sign.signData,
            paySig: sign.paySig,
            signature: sign.signature,
            mode: sign.mode || 'short_series_goods',
            success: () => {
              // 以 signData 里的单号为准（云函数可能自行生成/改写），对账才不会错位
              let tradedNo = outTradeNo;
              try {
                tradedNo = JSON.parse(sign.signData).outTradeNo || outTradeNo;
              } catch (e) {
                // signData 解析失败就沿用本地单号
              }
              finish(sign, tradedNo, cb);
            },
            fail: ({ errMsg, errCode }) => {
              const text = errText(errCode, errMsg);
              wx.showToast({ title: text, icon: 'none', duration: 2500 });
              cb(false, { errCode, errMsg, text, outTradeNo });
            },
          });
        })
        .catch((err) => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '下单失败', icon: 'none', duration: 2500 });
          cb(false, { errCode: 'SIGN_FAIL', errMsg: err.message });
        });
    },
    fail: (e) => {
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      cb(false, { errCode: 'NO_CODE', errMsg: e.errMsg });
    },
  });
}

/**
 * 支付回调成功后的收尾：
 *   strictServerConfirm=true  → 查单确认已支付才解锁；确认不上则先解锁并标 pending，
 *                               下次进页面由 syncPending() 补齐（避免用户付了钱没权益）
 *   strictServerConfirm=false → 直接按前端回调解锁（仅临时联调）
 */
function finish(sign, tradedNo, cb) {
  const base = { outTradeNo: tradedNo, env: sign.env, cost: sign.goodsPrice };

  if (!config.strictServerConfirm) {
    markPaid(base);
    cb(true, base);
    return;
  }

  wx.showLoading({ title: '确认支付结果…', mask: true });
  confirmWithRetry(tradedNo)
    .then((r) => {
      wx.hideLoading();
      if (r.paid) {
        markPaid(Object.assign({}, base, { confirmed: true }));
        cb(true, base);
        return;
      }
      markPaid(Object.assign({}, base, { pending: true }));
      wx.showToast({ title: '支付已提交，权益稍后自动到账', icon: 'none', duration: 2500 });
      cb(true, Object.assign({}, base, { pending: true }));
    })
    .catch((err) => {
      wx.hideLoading();
      markPaid(Object.assign({}, base, { pending: true, confirmErr: err.message }));
      cb(true, Object.assign({}, base, { pending: true }));
    });
}

// 退款说明：虚拟支付没有前端退款 API。
// Android 等端在 MP 后台「虚拟支付 → 交易订单」操作，或服务端调 /xpay/refund_order；
// iOS 只能由用户向 App Store 申请。所以这里不再提供 refund() 占位函数。

module.exports = {
  isPaid,
  markPaid,
  resetPaid,
  orders,
  pendingOrders,
  pay,
  canPay,
  checkIosWx,
  syncPending,
  devModeActive,
  errText,
  newOutTradeNo,
  PAID_KEY,
  ORDER_KEY,
};
