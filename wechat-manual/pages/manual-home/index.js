// 城市名录页 — 按拼音/层级浏览 37 城, 点击进入详情, 长按/点按钮加入对比
const { CITIES } = require('../../utils/manual-cities.js');
const app = getApp();

Page({
  data: {
    cities: [],       // 当前筛选结果, 每项内联 picked (wxml 里不能调 indexOf)
    filter: 'all',    // all | 一线 | 新一线 | 二线 | 三线 | 四线 | 五线
    tiers: ['all', '一线', '新一线', '二线', '三线', '四线', '五线'],
    compare: [],
    count: 0,
    maxCompare: 3,
  },

  onLoad() {
    this.build();
  },

  // 从详情页 / 对比页返回时同步选中态
  onShow() {
    this.build();
  },

  // 按当前层级重建列表, 并把对比池状态内联到每一项
  build() {
    const picked = (app.compare || []).slice();
    const filter = this.data.filter;
    const cities = CITIES
      .filter((c) => filter === 'all' || c.tier === filter)
      .map((c) => Object.assign({}, c, { picked: picked.indexOf(c.pinyin) >= 0 }));
    this.setData({
      cities,
      compare: picked,
      count: picked.length,
      maxCompare: app.maxCompare,
    });
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.tier });
    this.build();
  },

  openCity(e) {
    const pinyin = e.currentTarget.dataset.pinyin;
    wx.navigateTo({ url: `/pages/city/city?pinyin=${pinyin}` });
  },

  toggleCompare(e) {
    const pinyin = e.currentTarget.dataset.pinyin;
    if (!app.toggleCompare(pinyin)) {
      wx.showToast({ title: `最多对比${app.maxCompare}城`, icon: 'none' });
      return;
    }
    this.build();
  },

  goCompare() {
    wx.switchTab({ url: '/pages/compare/compare' });
  },
});
