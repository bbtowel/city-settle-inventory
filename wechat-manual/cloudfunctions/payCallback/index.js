// 云函数: 支付回调 — 写入订单记录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { outTradeNo, returnCode, resultCode } = event;
  const db = cloud.database();
  if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS') {
    await db.collection('orders').add({
      data: {
        outTradeNo,
        paidAt: new Date(),
        priceFen: 200,
        status: 'paid',
      },
    });
  }
  return { errcode: 0, errmsg: 'OK' };
};
