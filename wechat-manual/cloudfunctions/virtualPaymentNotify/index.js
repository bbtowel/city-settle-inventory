// 云函数: virtualPaymentNotify
// 作用: 接收平台的发货推送 xpay_goods_deliver_notify → 验签 → 幂等 → 记账发货
//
// 为什么需要它：前端 success 回调会丢（用户中途退出、断网、杀进程），
// 官方明确「前端支付回调不作为发货依据」，发货以推送为准、查单(query_order)兜底。
//
// 两种接法（选一个）：
//   A. 小程序后台「开发管理 → 开发设置 → 消息推送」→ 启用云开发/云函数推送，选本函数
//      （云开发会把 XML 解析成 JSON 传入，验签由平台完成）
//   B. 给本函数开「HTTP 访问服务」，把 URL 填到消息推送，Token 填到 config.js（明文模式）
//      这种接法 event 里有 httpMethod / body / queryStringParameters，需要自己验签
//
// 返回：HTTP → XML；云函数调用 → JSON
const cloud = require('wx-server-sdk');
const cfg = require('./config.js');
const lib = require('./lib.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const ORDERS = 'xpay_orders';

/** 幂等发货：同一 wx_order_id 只发一次 */
async function deliver(data) {
  const key = data.wxOrderId || data.outTradeNo;
  if (!key) return { ok: false, msg: '推送里没有单号' };

  const found = await db
    .collection(ORDERS)
    .where(data.wxOrderId ? { wxOrderId: data.wxOrderId } : { outTradeNo: data.outTradeNo })
    .limit(1)
    .get();
  const doc = found.data && found.data[0];

  if (!doc) {
    // 订单可能没落库（比如用户在旧版本客户端支付），补一条已发货记录，方便对账
    await db.collection(ORDERS).add({
      data: {
        outTradeNo: data.outTradeNo || '',
        wxOrderId: data.wxOrderId || '',
        openid: data.openid || '',
        productId: data.productId || '',
        buyQuantity: data.quantity || 1,
        status: 'delivered',
        paidAt: new Date(),
        deliveredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'notify',
      },
    });
    return { ok: true, duplicated: false };
  }

  if (doc.status === 'delivered') return { ok: true, duplicated: true };

  await db.collection(ORDERS).doc(doc._id).update({
    data: {
      status: 'delivered',
      wxOrderId: data.wxOrderId || doc.wxOrderId || '',
      paidAt: doc.paidAt || new Date(),
      deliveredAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { ok: true, duplicated: false };
}

exports.main = async (event) => {
  const isHttp = !!(event && (event.httpMethod || event.body || event.queryStringParameters));
  const xml = isHttp
    ? (event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '')
    : '';

  // A. 云开发消息推送：字段已解析
  if (!isHttp) {
    const data = {
      event: event.Event || event.event,
      openid: event.OpenId || event.openid,
      outTradeNo: event.OutTradeNo || event.outTradeNo,
      wxOrderId: (event.WeChatPayInfo && event.WeChatPayInfo.MchOrderNo) || '',
      productId: (event.GoodsInfo && event.GoodsInfo.ProductId) || '',
      quantity: Number((event.GoodsInfo && event.GoodsInfo.Quantity) || 1),
    };
    if (data.event && data.event !== 'xpay_goods_deliver_notify') {
      return { errcode: 0, errmsg: 'ignored:' + data.event };
    }
    const r = await deliver(data);
    return { errcode: r.ok ? 0 : 1, errmsg: r.ok ? 'OK' : r.msg };
  }

  // B. HTTP 访问服务：自己验签 + 自己解析
  const q = event.queryStringParameters || {};
  if (
    !lib.verifySignature({
      token: cfg.token,
      signature: q.signature || q.msg_signature,
      timestamp: q.timestamp,
      nonce: q.nonce,
    })
  ) {
    return { statusCode: 401, headers: { 'Content-Type': 'text/xml' }, body: lib.failXml(401, 'invalid signature') };
  }

  const data = lib.parseNotify(xml);
  if (data.event && data.event !== 'xpay_goods_deliver_notify') {
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: lib.successXml() };
  }
  if (cfg.productId && data.productId && data.productId !== cfg.productId) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: lib.failXml(1, 'product mismatch') };
  }

  try {
    const r = await deliver(data);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: r.ok ? lib.successXml() : lib.failXml(1, r.msg),
    };
  } catch (e) {
    // 返回非 0 平台会重试（最多 15 次），所以失败要如实返回
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: lib.failXml(1, (e && e.message) || 'error') };
  }
};
