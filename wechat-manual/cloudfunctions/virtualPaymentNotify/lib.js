// 发货推送解析与验签（纯函数，无云开发依赖）— 便于 node 单测
//
// 平台推送的事件名固定为 xpay_goods_deliver_notify，核心字段：
//   OutTradeNo                你下单时传的业务单号
//   WeChatPayInfo.MchOrderNo  平台单号 wx_order_id（跟踪订单、幂等去重以此为准）
//   OpenId                    买家的 openid
//   GoodsInfo.ProductId / Quantity  道具与数量
//
// 验签：消息推送「明文模式」下是 SHA1(sort(token, timestamp, nonce))，
// 与公众号/小程序消息推送一致；加密模式需要 AES 解密，本项目未实现，
// 所以后台消息推送请选「明文模式」或「兼容模式」（兼容模式明文请求仍可解析）。
const crypto = require('crypto');

/** 取标签内容，自动剥掉 CDATA */
function tag(xml, name) {
  if (!xml) return '';
  const re = new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>', 'i');
  const m = re.exec(xml);
  if (!m) return '';
  const v = String(m[1]).trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(v);
  return cdata ? cdata[1] : v;
}

/** 解析发货推送 XML → 扁平对象 */
function parseNotify(xml) {
  const payInfo = tag(xml, 'WeChatPayInfo');
  const goods = tag(xml, 'GoodsInfo');
  return {
    event: tag(xml, 'Event'),
    openid: tag(xml, 'OpenId'),
    outTradeNo: tag(xml, 'OutTradeNo'),
    wxOrderId: tag(payInfo, 'MchOrderNo') || tag(xml, 'MchOrderNo'),
    productId: tag(goods, 'ProductId') || tag(xml, 'ProductId'),
    quantity: Number(tag(goods, 'Quantity') || tag(xml, 'Quantity') || 1) || 1,
  };
}

/** 明文模式验签；token 为空视为未配置，直接放行（仅开发期） */
function verifySignature(opts) {
  const o = opts || {};
  if (!o.token) return true;
  if (!o.signature || !o.timestamp || !o.nonce) return false;
  const raw = [o.token, String(o.timestamp), String(o.nonce)].sort().join('');
  const expect = crypto.createHash('sha1').update(raw, 'utf8').digest('hex');
  return expect === String(o.signature).toLowerCase();
}

function successXml() {
  return '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>';
}

function failXml(code, msg) {
  return '<xml><ErrCode>' + code + '</ErrCode><ErrMsg><![CDATA[' + (msg || 'fail') + ']]></ErrMsg></xml>';
}

module.exports = { tag, parseNotify, verifySignature, successXml, failXml };
