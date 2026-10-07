// 欢迎页
const app = getApp();
Page({
  data: {
    answered: Object.keys(app.answers).length,
    total: 0,
  },
  onLoad() {
    const { QUESTIONS } = require('../../utils/questions.js');
    this.setData({ total: QUESTIONS.length, answered: Object.keys(app.answers).length });
  },
  onShow() {
    this.setData({ answered: Object.keys(app.answers).length });
  },
  start() {
    wx.navigateTo({ url: '/pages/quiz/quiz' });
  },
});
