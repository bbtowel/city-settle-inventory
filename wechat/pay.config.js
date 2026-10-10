// 支付配置 — 虚拟支付 ¥2 解锁测评
// 虚拟支付（wx.requestVirtualPayment）走「微信豆」结算，主体只需个体户/企业
// 比 wx.requestPayment 简单：无商户号、无证书、无云函数回调——签名在小程序前端完成
// 抽成: 微信 1% + iOS 30% (Android 实收 ¥1.8 / iOS 实收 ¥1.32)
module.exports = {
  // ¥2 = 20 微信豆 (1 元 = 10 微信豆)
  // 实测建议起步 ¥3, iOS 抽完到手接近 ¥2 (与原定价心智一致)
  priceFen: 200,          // 价格(分)
  priceBean: 20,          // 价格(微信豆): 200分 = 20豆
  priceLabel: '¥2',       // 界面显示文案
  productName: '归巢城市定居测评',  // 订单商品名(给用户看)
  devMode: true,          // true = 开发模式跳过真实支付(测试号无虚拟支付权限)
  // 启用虚拟支付:
  // 1. 非个人主体小程序 (个体户/企业)
  // 2. 后台「功能 → 虚拟支付」申请开通 + 选类目 (建议: 教育/工具)
  // 3. pay.config.js 置 devMode: false
  // 4. 提供 offerId + buyQuantity (购买数量)
  offerId: '',            // 后台生成的"道具/服务"ID
};
