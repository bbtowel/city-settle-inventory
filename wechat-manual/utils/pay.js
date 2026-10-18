// 支付封装 — 虚拟支付 (wx.requestVirtualPayment)
// 与微信支付(wx.requestPayment)的关键区别:
//   - 无需商户号/证书/云函数 — 前端签名即可
//   - 走「微信豆」结算 (1元=10豆), 用户首次需充值
//   - 抽成 1% + iOS 30% (Android 实收高, iOS 实收低)
//   - 主体限制: 个体户/企业 (个人主体不行)
const config = require('../pay.config.js');

const PAID_KEY = 'guichao_paid';

function isPaid() {
  return wx.getStorageSync(PAID_KEY) === true;
}

function markPaid() {
  wx.setStorageSync(PAID_KEY, true);
}

/**
 * 拉起虚拟支付。成功回调 cb(true), 失败/取消 cb(false)。
 * devMode=true: 直接标记已支付(测试号无虚拟支付权限, 开发调试用)。
 * devMode=false: 调 wx.requestVirtualPayment (基础库 >= 2.19.0)。
 */
function pay(cb) {
  if (config.devMode) {
    markPaid();
    cb(true);
    return;
  }
  if (!config.offerId) {
    wx.showToast({ title: 'offerId 未配置', icon: 'none' });
    cb(false);
    return;
  }
  wx.requestVirtualPayment({
    offerId: config.offerId,
    buyQuantity: config.priceBean,        // 微信豆数
    currencyType: 'wechatBean',
    productName: config.productName,
    success: () => {
      markPaid();
      cb(true);
    },
    fail: ({ errMsg }) => {
      if (errMsg && errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' });
      } else {
        wx.showToast({ title: '支付失败: ' + (errMsg || '未知错误'), icon: 'none' });
      }
      cb(false);
    },
  });
}

/**
 * 退款接口（后台管理/客服触发）。
 * 实际使用建议: 小程序后台手动退款, 此 API 仅供技术参考。
 */
function refund(outTradeNo, cb) {
  wx.requestVirtualPayment({
    functionName: 'refund',
    outTradeNo,
    success: (res) => cb(true, res),
    fail: (err) => cb(false, err),
  });
}

module.exports = { isPaid, markPaid, pay, refund, PAID_KEY };
