// 归巢 · 城市定居测评 + 小手册 — 全局逻辑
// 测评状态 (answers) 来自原 wechat 测评小程序; 对比池 (compare) 来自手册
App({
  onLaunch() {
    this.answers = wx.getStorageSync('guichao_answers') || {};
    this.compare = wx.getStorageSync('guichao_manual_compare') || [];
  },

  // ---- 测评答题 ----
  answers: {},
  saveAnswer(id, idx) {
    this.answers[id] = idx;
    wx.setStorageSync('guichao_answers', this.answers);
  },
  reset() {
    this.answers = {};
    wx.removeStorageSync('guichao_answers');
  },

  // ---- 手册对比池 (最多 3 城) ----
  compare: [],
  maxCompare: 3,
  toggleCompare(pinyin) {
    const i = this.compare.indexOf(pinyin);
    if (i >= 0) this.compare.splice(i, 1);
    else {
      if (this.compare.length >= this.maxCompare) return false;
      this.compare.push(pinyin);
    }
    wx.setStorageSync('guichao_manual_compare', this.compare);
    return true;
  },
});
