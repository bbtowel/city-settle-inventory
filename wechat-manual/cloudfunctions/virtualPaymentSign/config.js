// 虚拟支付下单配置 — 服务端为准，前端 pay.config.js 不参与金额计算
//
// 取值位置（小程序后台 mp.weixin.qq.com）：
//   offerId      → 支付与交易 → 虚拟支付 → 基本配置 → OfferID
//   appKeyProd   → 虚拟支付 → 基本配置 → 现网 AppKey
//   appKeySandbox→ 虚拟支付 → 基本配置 → 沙箱 AppKey（仅开发版调试用）
//   productId    → 虚拟支付 → 道具管理 → 道具 ID（需发布，发布后几分钟~半小时才可下单）
//   appSecret    → 开发管理 → 开发设置 → 开发者 ID → 小程序密钥（查单换 access_token 必填）
//
// 个人主体同样填这套参数，只是后台会多显示「月限额 10 万元」。
module.exports = {
  offerId: '',
  productId: '',

  goodsPrice: 200,        // 道具价格(分)：必须与后台道具价格完全一致，否则 -15013
  buyQuantity: 1,         // 购买数量（不是金额）

  env: 0,                 // 0 现网 / 1 沙箱；现网版本只能填 0（填 1 报 -15011）

  appKeyProd: '',
  appKeySandbox: '',

  // 兜底用：云调用 auth.code2Session 不可用时，用 AppSecret 走 https 换 session_key；
  // 后端查单接口 /xpay/query_order 不支持云调用，也必须用 AppSecret 换 access_token
  appSecret: '',

  attachTag: 'city-settle-inventory',
};
