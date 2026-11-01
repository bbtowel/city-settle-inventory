// 虚拟支付签名核心（纯函数，无云开发依赖）— 便于 node 单测
//
// 官方签名详解：
//   paySig    = hex(hmac_sha256(appKey,     uri + '&' + postBody))
//   signature = hex(hmac_sha256(sessionKey, postBody))
//   postBody 必须与实际发给微信的字符串完全一致（不改键顺序、不重新序列化）
const crypto = require('crypto');

const MODE = 'short_series_goods'; // 道具直购（个人主体只支持这一种，不做代币）

// outTradeNo：8-32 位，数字/大小写字母/_-|*@，不能以下划线开头（官方要求）
const TRADE_NO_RE = /^[0-9A-Za-z|*@_-]{8,32}$/;

function isValidTradeNo(s) {
  return typeof s === 'string' && TRADE_NO_RE.test(s) && s.charAt(0) !== '_';
}

const hmacSha256Hex = (key, msg) =>
  crypto.createHmac('sha256', String(key)).update(String(msg), 'utf8').digest('hex');

/**
 * 拼 signData 字符串。
 * 字段严格按官方文档：offerId / buyQuantity / env / currencyType / productId /
 * goodsPrice / outTradeNo / attach —— 不要往里面塞 mode，mode 是入参的兄弟字段，
 * 多塞字段有被判定 -15016（signData 格式有误）的风险。
 */
function buildSignData(opts) {
  const o = opts || {};
  const data = {
    offerId: String(o.offerId || ''),
    buyQuantity: Number(o.buyQuantity || 1),
    env: Number(o.env) === 1 ? 1 : 0,
    currencyType: 'CNY',
    productId: String(o.productId || ''),
    goodsPrice: Number(o.goodsPrice || 0),
    outTradeNo: String(o.outTradeNo || ''),
    attach: String(o.attach || ''),
  };
  return JSON.stringify(data);
}

function calcPaySig(appKey, uri, postBody) {
  return hmacSha256Hex(appKey, uri + '&' + postBody);
}

function calcSignature(sessionKey, postBody) {
  return hmacSha256Hex(sessionKey, postBody);
}

module.exports = {
  MODE,
  isValidTradeNo,
  buildSignData,
  calcPaySig,
  calcSignature,
  hmacSha256Hex,
};
