// 欢迎页 — ¥2 解锁测评
const app = getApp();
const pay = require('../../utils/pay.js');
const config = require('../../pay.config.js');

Page({
  data: {
    answered: 0,
    total: 0,
    paid: false,
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
    });
  },

  start() {
    if (!pay.isPaid()) {
      this.doPay();
      return;
    }
    wx.navigateTo({ url: '/pages/quiz/quiz' });
  },

  doPay() {
    pay.pay((ok) => {
      if (ok) {
        this.setData({ paid: true });
        wx.navigateTo({ url: '/pages/quiz/quiz' });
      }
    });
  },

  restart() {
    app.reset();
    this.setData({ answered: 0 });
  },
});
