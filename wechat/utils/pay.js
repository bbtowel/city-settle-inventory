// 支付封装 — ¥2 解锁测评
const config = require('../pay.config.js');

const PAID_KEY = 'guichao_paid';

function isPaid() {
  return wx.getStorageSync(PAID_KEY) === true;
}

function markPaid() {
  wx.setStorageSync(PAID_KEY, true);
}

/**
 * 拉起支付。成功回调 cb()。
 * devMode=true (无商户号/测试号): 直接标记已支付并回调 — 用于开发调试。
 * devMode=false: 云函数 createOrder 下单 → wx.requestPayment 拉起微信支付。
 */
function pay(cb) {
  if (config.devMode) {
    markPaid();
    cb(true);
    return;
  }
  wx.cloud.callFunction({
    name: 'createOrder',
    data: { priceFen: config.priceFen },
    success: (res) => {
      const order = res.result;
      if (!order || !order.payment) {
        wx.showToast({ title: '下单失败', icon: 'none' });
        return;
      }
      wx.requestPayment({
        ...order.payment,
        success: () => {
          markPaid();
          cb(true);
        },
        fail: () => wx.showToast({ title: '已取消支付', icon: 'none' }),
      });
    },
    fail: () => wx.showToast({ title: '网络异常，请重试', icon: 'none' }),
  });
}

module.exports = { isPaid, markPaid, pay, PAID_KEY };
