// 云函数: 下单 — 云开发「微信支付云调用」免鉴权
// 部署: 右键 cloudfunctions/createOrder → 上传并部署(云端安装依赖)
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const config = require('./config.js');  // { priceFen, mchId }
  const res = await cloud.cloudPay.unifiedOrder({
    body: '归巢城市定居测评',
    outTradeNo: 'GC' + Date.now() + Math.floor(Math.random() * 1000),
    spbillCreateIp: '127.0.0.1',
    subMchId: config.mchId,
    totalFee: config.priceFen,
    envId: cloud.DYNAMIC_CURRENT_ENV,
    functionName: 'payCallback',
  });
  return res;
};
