// 欢迎页 — ¥2 解锁测评
const app = getApp();
const pay = require('../../utils/pay.js');
const config = require('../../pay.config.js');

Page({
  data: {
    answered: 0,
    total: 0,
    paid: false,
    paying: false,          // 支付进行中：按钮切文案 + 拦重复点击
    priceLabel: config.priceLabel,
  },

  onLoad() {
    const { QUESTIONS } = require('../../utils/questions.js');
    this.setData({ total: QUESTIONS.length });
  },

  onShow() {
    this.setData({
      answered: Object.keys(app.answers).length,
      paid: pay.isPaid(),
      paying: false,
    });
    // 补偿：上次支付成功但服务端查单没跟上，这里静默补确认
    pay.syncPending();
  },

  start() {
    if (this.data.paying) return;
    if (!pay.isPaid()) {
      this.doPay();
      return;
    }
    wx.navigateTo({ url: '/pages/quiz/quiz' });
  },

  doPay() {
    const that = this;
    this.setData({ paying: true });
    pay.pay((ok) => {
      that.setData({ paying: false });
      if (ok) {
        that.setData({ paid: true });
        wx.navigateTo({ url: '/pages/quiz/quiz' });
      }
    });
  },

  restart() {
    app.reset();
    this.setData({ answered: 0 });
  },
});
