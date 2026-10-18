// 城市名录页 — 按拼音/层级浏览 37 城, 点击进入详情, 长按加入对比
const { CITIES } = require('../../utils/manual-cities.js');
const app = getApp();

Page({
  data: {
    cities: [],
    filter: 'all',      // all | 一线 | 新一线 | 二线 | 三线 | 四线 | 五线
    tiers: ['all', '一线', '新一线', '二线', '三线', '四线', '五线'],
    compare: [],
  },

  onLoad() {
    this.setData({ cities: CITIES });
  },

  onShow() {
    this.setData({ compare: app.compare });
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.tier });
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
    this.setData({ compare: app.compare });
  },

  goCompare() {
    wx.switchTab({ url: '/pages/compare/compare' });
  },
});
