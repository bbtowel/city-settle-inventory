// 云函数: virtualPaymentSign
// 作用: 生成虚拟支付下单的 signData + paySig + signature，并把订单落库(pending)
//
// 为什么要放云函数:
//   paySig    = hmac_sha256(appKey, 'requestVirtualPayment&' + signData)   appKey 是后台密钥
//   signature = hmac_sha256(sessionKey, signData)                          sessionKey 只能用 code 换
// 两者都不能放前端。
//
// 部署: 右键 cloudfunctions/virtualPaymentSign → 上传并部署(云端安装依赖)
// 调用: wx.cloud.callFunction({ name: 'virtualPaymentSign', data: { code, outTradeNo } })
//
// 依赖的云数据库集合（云开发控制台手动建，权限选「仅创建者可读写」即可，云函数不受限）：
//   xpay_orders  — 订单表，字段见下方 add() 处
const cloud = require('wx-server-sdk');
const https = require('https');
const cfg = require('./config.js');
const lib = require('./lib.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const ORDERS = 'xpay_orders';

const fail = (code, msg) => ({ ok: false, code, msg });

/** code → session_key（云调用优先，失败降级 https + AppSecret） */
async function getSessionKey(code) {
  try {
    const res = await cloud.openapi.auth.code2Session({ jsCode: code });
    const key = res.sessionKey || res.session_key || (res.data && res.data.session_key);
    if (key) return key;
  } catch (e) {
    // 云调用不可用（缺 config.json 权限 / 环境未开通）时走下面的兜底
  }
  if (!cfg.appSecret) return '';

  const appid = cloud.getWXContext().APPID;
  const url =
    'https://api.weixin.qq.com/sns/jscode2session?grant_type=authorization_code' +
    '&appid=' + encodeURIComponent(appid) +
    '&secret=' + encodeURIComponent(cfg.appSecret) +
    '&js_code=' + encodeURIComponent(code);

  const body = await new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let raw = '';
      r.on('data', (c) => (raw += c));
      r.on('end', () => resolve(raw));
    }).on('error', reject);
  });

  try {
    const json = JSON.parse(body);
    return json.session_key || '';
  } catch (e) {
    return '';
  }
}

/** 订单落库：查单确认与发货推送都靠它做幂等基准 */
async function savePendingOrder(order) {
  try {
    await db.collection(ORDERS).add({ data: order });
  } catch (e) {
    // 集合不存在时首次自动创建会失败一轮，不阻断支付主流程
    console.warn('savePendingOrder failed:', e && e.message);
  }
}

exports.main = async (event) => {
  const { code, outTradeNo } = event || {};

  if (!lib.isValidTradeNo(outTradeNo)) {
    return fail('BAD_TRADE_NO', '订单号不合法（8-32 位，数字/字母/_-|*@，不能以下划线开头）');
  }
  if (!cfg.offerId || !cfg.productId) {
    return fail('NO_CONFIG', '云函数 config.js 未填 offerId / productId');
  }

  // 现网版本 env 只能是 0；沙箱(1)仅开发版调试用，且要配沙箱 AppKey
  const env = Number(cfg.env) === 1 ? 1 : 0;
  const appKey = env === 1 ? cfg.appKeySandbox : cfg.appKeyProd;
  if (!appKey) {
    return fail('NO_APPKEY', env === 1 ? '缺少沙箱 AppKey' : '缺少现网 AppKey');
  }

  const sessionKey = await getSessionKey(code);
  if (!sessionKey) {
    return fail('NO_SESSION', '换取 session_key 失败：检查云调用权限或补 config.js 的 appSecret');
  }

  const { OPENID, APPID } = cloud.getWXContext();
  const attach = JSON.stringify({ t: cfg.attachTag || '', o: OPENID || '', a: APPID || '' });

  const signData = lib.buildSignData({
    offerId: cfg.offerId,
    buyQuantity: cfg.buyQuantity || 1,
    env,
    productId: cfg.productId,
    goodsPrice: cfg.goodsPrice,
    outTradeNo,
    attach,
  });

  // 顺序敏感：signData 先定稿再参与签名，前端只会原样回传该字符串
  const paySig = lib.calcPaySig(appKey, 'requestVirtualPayment', signData);
  const signature = lib.calcSignature(sessionKey, signData);

  await savePendingOrder({
    outTradeNo,
    openid: OPENID,
    appid: APPID,
    offerId: cfg.offerId,
    productId: cfg.productId,
    goodsPrice: cfg.goodsPrice,
    buyQuantity: Number(cfg.buyQuantity || 1),
    env,
    status: 'pending',      // pending → paid → delivered / refunded
    wxOrderId: '',
    attach,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    ok: true,
    signData,
    paySig,
    signature,
    mode: lib.MODE,
    env,
    goodsPrice: cfg.goodsPrice,
    outTradeNo,
  };
};
