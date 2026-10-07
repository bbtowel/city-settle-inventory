// 归巢小程序 — 全局逻辑
App({
  onLaunch() {
    // 断点续答存储在本地
    this.answers = wx.getStorageSync('guichao_answers') || {};
  },
  answers: {},
  saveAnswer(id, idx) {
    this.answers[id] = idx;
    wx.setStorageSync('guichao_answers', this.answers);
  },
  reset() {
    this.answers = {};
    wx.removeStorageSync('guichao_answers');
  },
});
