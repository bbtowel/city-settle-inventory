// 支付配置 — 开始测评需支付 ¥2
module.exports = {
  priceFen: 200,          // 价格(分): 200 = ¥2.00
  priceLabel: '¥2',
  devMode: true,          // true = 开发模式跳过真实支付(测试号无法拉起微信支付)
  // 启用真实支付需要:
  // 1. 正式 AppID (非测试号)
  // 2. 微信支付商户号 mchId, 且与 AppID 绑定 (个人主体无法开通, 需企业/个体户)
  // 3. 开通云开发, 部署 cloudfunctions/createOrder + payCallback
  mchId: '',              // 商户号 (填入后云函数使用)
  envId: '',              // 云开发环境 ID
};
