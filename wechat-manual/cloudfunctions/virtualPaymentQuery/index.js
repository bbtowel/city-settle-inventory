// 云函数: virtualPaymentQuery
// 作用: 服务端查单（/xpay/query_order），确认「到底付没付」，并更新订单状态
//
// 两种调用方式：
//   1. 前端支付成功后确认：{ outTradeNo }  → 返回 { ok, paid, status }
//   2. 定时兜底（config.json 里已配 5 分钟触发器）：event 无 outTradeNo
//      → 扫一批 pending 订单逐笔查，支付成功就补记，覆盖「推送丢失 / 用户中途退出」
//
// 部署: 右键 cloudfunctions/virtualPaymentQuery → 上传并部署(云端安装依赖)
// 前提: config.js 填 appSecret（本接口不支持云调用，access_token 必须自己换）
const cloud = require('wx-server-sdk');
const https = require('https');
const cfg = require('./config.js');
const lib = require('./lib.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const ORDERS = 'xpay_orders';
const META = 'xpay_meta';   // access_token 缓存（集合不存在会退回内存缓存，不影响功能）

const fail = (code, msg) => ({ ok: false, code, msg });

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let raw = '';
      r.on('data', (c) => (raw += c));
      r.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

function httpPostJson(url, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (r) => {
        let raw = '';
        r.on('data', (c) => (raw += c));
        r.on('end', () => resolve(raw));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let tokenCache = { token: '', exp: 0 };

/** access_token 缓存：内存 → 云数据库 → 接口换取（有效期 7200s，提前 5 分钟过期） */
async function getAccessToken(appid) {
  if (tokenCache.token && tokenCache.exp > Date.now()) return tokenCache.token;
  if (!cfg.appSecret) throw new Error('config.js 未填 appSecret，无法换 access_token');

  const url =
    'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential' +
    '&appid=' + encodeURIComponent(appid) +
    '&secret=' + encodeURIComponent(cfg.appSecret);
  const json = JSON.parse(await httpGet(url));
  if (!json.access_token) throw new Error('换 access_token 失败：' + (json.errmsg || '未知错误'));

  tokenCache = { token: json.access_token, exp: Date.now() + (json.expires_in - 300) * 1000 };
  try {
    await db.collection(META).doc('access_token').set({
      data: { token: tokenCache.token, exp: tokenCache.exp, updatedAt: new Date() },
    });
  } catch (e) {
    // 缓存写不进去无所谓，内存缓存已经够用
  }
  return tokenCache.token;
}

/** 单笔查单；openid 走订单记录，避免前端伪造别人的单号 */
async function queryOrder(outTradeNo, openid) {
  const body = lib.buildQueryBody({ openid, orderId: outTradeNo, env: cfg.env });
  const paySig = lib.calcPaySig(cfg.appKeyProd, body);
  const { APPID } = cloud.getWXContext();

  const token = await getAccessToken(APPID);
  const url =
    'https://api.weixin.qq.com/xpay/query_order?access_token=' +
    encodeURIComponent(token) + '&pay_sig=' + encodeURIComponent(paySig);

  const json = JSON.parse(await httpPostJson(url, body));
  if (json.errcode && Number(json.errcode) !== 0) {
    return fail('QUERY_FAIL', '查单失败：' + (json.errmsg || json.errcode));
  }

  const order = json.order || {};
  const status = Number(order.status);
  const paid = lib.isPaidStatus(status);

  if (paid) {
    await markPaidInDb(outTradeNo, order);
  }

  return {
    ok: true,
    paid,
    status,
    statusText: lib.statusText(status),
    wxOrderId: order.wx_order_id || '',
    orderId: outTradeNo,
  };
}

/** 幂等更新订单：只有 pending 才改，重复查单不会把状态改回去 */
async function markPaidInDb(outTradeNo, order) {
  try {
    const found = await db.collection(ORDERS).where({ outTradeNo }).limit(1).get();
    const doc = found.data && found.data[0];
    if (!doc) return;
    if (doc.status && doc.status !== 'pending') return;
    await db.collection(ORDERS).doc(doc._id).update({
      data: {
        status: 'paid',
        paidAt: new Date(),
        wxOrderId: (order && order.wx_order_id) || doc.wxOrderId || '',
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn('markPaidInDb failed:', e && e.message);
  }
}

/** 定时兜底：扫 pending 订单逐笔确认 */
async function sweep() {
  const limit = Number(cfg.sweepLimit || 20);
  const res = await db.collection(ORDERS).where({ status: 'pending' }).orderBy('createdAt', 'asc').limit(limit).get();
  const list = res.data || [];
  let paidCount = 0;
  const errors = [];

  for (const doc of list) {
    try {
      const r = await queryOrder(doc.outTradeNo, doc.openid);
      if (r.ok && r.paid) paidCount++;
      if (!r.ok) errors.push(doc.outTradeNo + ': ' + r.msg);
    } catch (e) {
      errors.push(doc.outTradeNo + ': ' + (e && e.message));
    }
  }

  return { ok: true, scanned: list.length, paid: paidCount, errors };
}

exports.main = async (event) => {
  const { outTradeNo } = event || {};

  if (!outTradeNo) return sweep();   // 定时触发器走到这里

  if (!lib.isValidTradeNo(outTradeNo)) {
    return fail('BAD_TRADE_NO', '订单号不合法');
  }
  if (!cfg.offerId || !cfg.appKeyProd) {
    return fail('NO_CONFIG', 'virtualPaymentQuery/config.js 未填 offerId / appKeyProd');
  }

  const { OPENID } = cloud.getWXContext();

  // 优先用订单里的 openid（定时兜底时没有用户上下文，也必须用它）
  let openid = OPENID;
  try {
    const found = await db.collection(ORDERS).where({ outTradeNo }).limit(1).get();
    const doc = found.data && found.data[0];
    if (doc && doc.openid) openid = doc.openid;
  } catch (e) {
    // 查不到就用当前用户 openid，接口会返回订单不存在
  }

  if (!openid) return fail('NO_OPENID', '缺少 openid，无法查单');

  try {
    return await queryOrder(outTradeNo, openid);
  } catch (e) {
    return fail('QUERY_ERROR', (e && e.message) || '查单异常');
  }
};
