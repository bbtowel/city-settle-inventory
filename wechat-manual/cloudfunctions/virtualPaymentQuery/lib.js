// 查单接口的纯函数部分（无云开发依赖）— 便于 node 单测
//
// 官方接口：POST https://api.weixin.qq.com/xpay/query_order?access_token=xx&pay_sig=xx
// 注意 pay_sig 的 uri 是「/xpay/query_order」（不带 query 参数），body 必须与发出的一致。
// 本接口不支持云调用，access_token 只能自己用 appid + appSecret 换。
const crypto = require('crypto');

const QUERY_URI = '/xpay/query_order';

const hmacSha256Hex = (key, msg) =>
  crypto.createHmac('sha256', String(key)).update(String(msg), 'utf8').digest('hex');

const TRADE_NO_RE = /^[0-9A-Za-z|*@_-]{8,32}$/;
function isValidTradeNo(s) {
  return typeof s === 'string' && TRADE_NO_RE.test(s) && s.charAt(0) !== '_';
}

/** order_id 与 wx_order_id 二选一，这里统一用业务单号 order_id */
function buildQueryBody(opts) {
  const o = opts || {};
  return JSON.stringify({
    openid: String(o.openid || ''),
    env: Number(o.env) === 1 ? 1 : 0,
    order_id: String(o.orderId || ''),
  });
}

function calcPaySig(appKey, postBody) {
  return hmacSha256Hex(appKey, QUERY_URI + '&' + postBody);
}

// order.status 是数字：2 已支付待发货 / 4 已发货 / 5 已退款 / 7 退款失败 / 8 用户退款完成
const PAID_STATUS = [2, 4];

function isPaidStatus(status) {
  return PAID_STATUS.indexOf(Number(status)) >= 0;
}

function statusText(status) {
  const map = {
    2: '已支付待发货',
    4: '已发货',
    5: '已退款',
    7: '退款失败',
    8: '用户退款完成',
  };
  return map[Number(status)] || ('未知状态 ' + status);
}

module.exports = {
  QUERY_URI,
  PAID_STATUS,
  isValidTradeNo,
  buildQueryBody,
  calcPaySig,
  isPaidStatus,
  statusText,
  hmacSha256Hex,
};
