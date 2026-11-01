// 支付配置 — 虚拟支付（米大师）解锁测评
//
// 为什么这条路「不需要营业执照」：
//   微信 2026-08-31 上线「虚拟支付:个人」，个人主体小程序（居民身份证注册、
//   类目含「工具」、已认证备案）即可开通收款，不需要企业主体、不需要微信支付商户号、
//   不需要对公账户。代价是：只能卖虚拟商品、全终端月限额 10 万元、
//   Android 等端腾讯技术服务费 1%，iOS 走 Apple IAP 抽 12%。
//   官方文档：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/person
//
// 计费链路：
//   点支付 → wx.login 取 code → 云函数 virtualPaymentSign 签名 + 落库(pending)
//   → wx.requestVirtualPayment 拉起收银台 → success 后云函数 virtualPaymentQuery 查单确认
//   → 确认已支付才解锁（平台另有发货推送 virtualPaymentNotify 兜底）
//
// 前置条件（缺一不可）：
//   1. 个人主体 / 个体户 / 企业均可（个人主体需类目含「工具」+ 认证备案 + 月限额 10 万）
//   2. 小程序后台「支付与交易 → 虚拟支付」开通并签约
//   3. 「虚拟支付 → 基本配置」拿 OfferID + 现网 AppKey
//   4. 「道具管理」建道具拿 productId，并发布至现网（发布后几分钟~半小时同步）
//   5. iOS 端：配置小程序简称 + 开通苹果 IAP；用户微信需 8.0.68+
//   6. 已开通云开发，依次部署 cloudfunctions/{virtualPaymentSign,virtualPaymentQuery,virtualPaymentNotify}
//
// 注意：下单金额与道具参数在云函数侧（cloudfunctions/virtualPaymentSign/config.js），
//      前端只负责界面展示，不参与金额计算，避免被改包改价。
module.exports = {
  // true = 假支付：不发任何网络请求、不调支付 API，直接标记已解锁（本地联调 UI 用）
  // 真机验证真实支付前，务必改成 false
  devMode: true,

  // 0 = 现网环境，1 = 沙箱环境
  // 现网版本（正式版/体验版）env 只能填 0，填 1 会报 -15011；沙箱仅在开发版调试可用
  env: 0,

  priceFen: 200,       // 价格(分)，用于和界面文案做一致性检查
  priceLabel: '¥2',    // 界面展示文案

  // iOS 端门槛：微信客户端版本（不是基础库版本）
  iosMinWx: '8.0.68',

  // 支付成功后是否必须由服务端查单确认才解锁（官方要求：前端回调不作为发货依据）
  // false 仅用于「没配云函数、只想先跑通界面」的临时联调
  strictServerConfirm: true,
  confirmRetry: 3,        // 查单重试次数
  confirmRetryDelay: 700, // 每次重试间隔(ms)

  signFunction: 'virtualPaymentSign',      // 下单签名云函数
  confirmFunction: 'virtualPaymentQuery',  // 查单确认云函数
  cloudEnv: '',                            // 云开发环境 ID，留空 = 默认环境

  lowVersionTip: '当前微信版本过低，请升级后再支付',
};
