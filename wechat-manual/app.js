// 归巢小手册 — 全局逻辑
App({
  onLaunch() {
    this.compare = wx.getStorageSync('guichao_manual_compare') || [];
  },
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
