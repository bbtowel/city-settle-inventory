// 服务端签名/查单/推送逻辑测试: node test/pay-server.cjs
// 只测云函数里的纯函数（不 require wx-server-sdk），签名用固定向量做回归，
// 避免以后改代码时把算法悄悄改错（真机上这类错误只会给出 -15005 / -15006）。
const path = require('node:path');

const sign = require(path.join(__dirname, '..', 'wechat-manual', 'cloudfunctions', 'virtualPaymentSign', 'lib.js'));
const query = require(path.join(__dirname, '..', 'wechat-manual', 'cloudfunctions', 'virtualPaymentQuery', 'lib.js'));
const notify = require(path.join(__dirname, '..', 'wechat-manual', 'cloudfunctions', 'virtualPaymentNotify', 'lib.js'));

let pass = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log('✅', msg); } else { fail++; console.log('❌', msg); }
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- 1. signData 结构 ----
{
  const s = sign.buildSignData({
    offerId: 'of_1', buyQuantity: 1, env: 0, productId: 'p_1', goodsPrice: 200,
    outTradeNo: 'GC20261101000000ABCDEF', attach: '{"t":"x"}',
  });
  const o = JSON.parse(s);
  console.log('\n[1] signData 结构');
  check(typeof s === 'string', '是字符串（传对象会 -15016）');
  check(
    eq(Object.keys(o), ['offerId', 'buyQuantity', 'env', 'currencyType', 'productId', 'goodsPrice', 'outTradeNo', 'attach']),
    '字段与顺序严格按官方文档'
  );
  check(o.mode === undefined, 'signData 里不含 mode（mode 是入参兄弟字段）');
  check(o.currencyType === 'CNY', '币种固定 CNY');
  check(o.goodsPrice === 200 && typeof o.goodsPrice === 'number', '金额单位是分且为数字');
}

// ---- 2. env 归一化 ----
{
  console.log('\n[2] env 归一化');
  check(JSON.parse(sign.buildSignData({ env: 1 })).env === 1, '1 保留沙箱');
  check(JSON.parse(sign.buildSignData({ env: 2 })).env === 0, '非法值回落现网 0');
  check(JSON.parse(sign.buildSignData({})).env === 0, '缺省为现网 0');
}

// ---- 3. 订单号规则（官方：8-32 位，数字/字母/_-|*@，不能 _ 开头）----
{
  console.log('\n[3] 订单号规则');
  check(sign.isValidTradeNo('GC20261101000000ABCDEF'), '22 位正常单号通过');
  check(!sign.isValidTradeNo('GC12345'), '7 位太短被拒');
  check(!sign.isValidTradeNo('_GC20261101000000'), '下划线开头被拒');
  check(!sign.isValidTradeNo('GC2026 1101 0000AB'), '含空格被拒');
  check(!sign.isValidTradeNo('G'.repeat(33)), '33 位太长被拒');
  check(sign.isValidTradeNo('GC-2026|01*ab@c1'), '_-|*@ 允许');
  check(query.isValidTradeNo('GC20261101000000ABCDEF'), '查单侧规则一致');
}

// ---- 4. 签名固定向量（回归用）----
{
  console.log('\n[4] 签名向量');
  check(
    sign.calcPaySig('appkey_test', 'requestVirtualPayment', '{"a":1}') ===
      '8b6d8e1a06d79558727a2022ce21270e252d932e204b7076078a05477dcbae7b',
    'paySig = hmac_sha256(appKey, "requestVirtualPayment&" + signData)'
  );
  check(
    sign.calcSignature('sessionkey_test', '{"a":1}') ===
      'a65f62d95987df995f749e42a3e48a9cf43f4b8d4fce100298f6c54fb48aa216',
    'signature = hmac_sha256(sessionKey, signData)'
  );
  const sig = sign.calcPaySig('k', 'requestVirtualPayment', '{}');
  check(/^[0-9a-f]{64}$/.test(sig), '输出 64 位小写 hex');
  check(sign.calcPaySig('k', 'requestVirtualPayment', '{}') !== sign.calcPaySig('k', '/xpay/query_order', '{}'), 'uri 参与签名');
}

// ---- 5. 查单请求 ----
{
  console.log('\n[5] 查单 /xpay/query_order');
  const body = query.buildQueryBody({ openid: 'o1', orderId: 'GC20261101000000ABCDEF', env: 0 });
  const o = JSON.parse(body);
  check(eq(Object.keys(o), ['openid', 'env', 'order_id']), '请求体字段正确');
  check(o.order_id === 'GC20261101000000ABCDEF', '用业务单号 order_id 查');
  check(query.QUERY_URI === '/xpay/query_order', 'pay_sig 的 uri 是 /xpay/query_order');
  check(
    query.calcPaySig('appkey_test', body) ===
      'a4a2fd24518a919e997f9cfe0f9480d9fecf0ba60c6c7690bca60e6b94491bf3',
    '查单 pay_sig 向量一致'
  );
  check(query.isPaidStatus(2) && query.isPaidStatus(4), 'status 2/4 视为已支付');
  check(!query.isPaidStatus(5) && !query.isPaidStatus(8) && !query.isPaidStatus(0), '退款/未支付不算已支付');
  check(query.statusText(2) === '已支付待发货', '状态文案可读');
}

// ---- 6. 发货推送解析 ----
{
  const xml = `<xml>
  <Event><![CDATA[xpay_goods_deliver_notify]]></Event>
  <OpenId><![CDATA[oABC123]]></OpenId>
  <OutTradeNo><![CDATA[GC20261101000000ABCDEF]]></OutTradeNo>
  <WeChatPayInfo>
    <MchOrderNo><![CDATA[wx_order_999]]></MchOrderNo>
  </WeChatPayInfo>
  <GoodsInfo>
    <ProductId><![CDATA[prod_1]]></ProductId>
    <Quantity>1</Quantity>
  </GoodsInfo>
</xml>`;
  const d = notify.parseNotify(xml);
  console.log('\n[6] 发货推送解析');
  check(d.event === 'xpay_goods_deliver_notify', 'Event 解析正确');
  check(d.outTradeNo === 'GC20261101000000ABCDEF', 'OutTradeNo 解析正确');
  check(d.wxOrderId === 'wx_order_999', '嵌套的 WeChatPayInfo.MchOrderNo 能取到（幂等键）');
  check(d.openid === 'oABC123' && d.productId === 'prod_1', 'openid / productId 解析正确');
  check(d.quantity === 1, '数量为数字');
  check(notify.parseNotify('').event === '', '空 XML 不炸');
}

// ---- 7. 推送验签与回包 ----
{
  console.log('\n[7] 推送验签');
  const ok = notify.verifySignature({
    token: 'wx_token', signature: '0e997c177849961522ac230c2408d092019afd3e', timestamp: '1700000000', nonce: '12345',
  });
  check(ok === true, '明文模式 sha1(token,timestamp,nonce) 验签通过');
  check(
    notify.verifySignature({ token: 'wx_token', signature: 'deadbeef', timestamp: '1700000000', nonce: '12345' }) === false,
    '签名不符拒绝'
  );
  check(notify.verifySignature({ token: '', signature: '' }) === true, '未配 token 时跳过验签（仅开发期）');
  check(/ErrCode>0</.test(notify.successXml()), '成功回包 ErrCode 为 0（否则平台重试 15 次）');
  check(/ErrCode>1</.test(notify.failXml(1, 'x')), '失败回包非 0');
}

console.log(fail === 0 ? `\n全部通过 (${pass} 项)` : `\n${fail} 项失败 / ${pass} 项通过`);
process.exit(fail === 0 ? 0 : 1);
