// 查单云函数配置 —— 与 virtualPaymentSign/config.js 保持同一套参数
// （云函数各自独立打包，无法跨目录 require，所以这里复制一份，改的时候两边都要改）
module.exports = {
  offerId: '',
  appKeyProd: '',
  appSecret: '',   // 开发管理 → 开发设置 → 小程序密钥；换 access_token 必填
  env: 0,
  sweepLimit: 20,  // 定时兜底一次最多扫多少笔 pending 订单
};
