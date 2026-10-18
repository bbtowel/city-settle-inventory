// 单城详情页 — 6 维度分卡展示全部字段, 含单位与来源
const { CITIES, SRC_TITLE } = require('../../utils/manual-cities.js');
const app = getApp();

Page({
  data: {
    city: null,
    dims: [],
    inCompare: false,
    SRC_TITLE,
  },

  onLoad(query) {
    const city = CITIES.find(c => c.pinyin === query.pinyin);
    if (!city) { wx.showToast({ title: '城市不存在', icon: 'none' }); return; }
    this.setData({ city, dims: city.dims, inCompare: app.compare.includes(city.pinyin) });
    wx.setNavigationBarTitle({ title: city.name });
  },

  toggleCompare() {
    if (!app.toggleCompare(this.data.city.pinyin)) {
      wx.showToast({ title: `最多对比${app.maxCompare}城`, icon: 'none' });
      return;
    }
    this.setData({ inCompare: app.compare.includes(this.data.city.pinyin) });
  },

  copySrc(e) {
    const url = e.currentTarget.dataset.url;
    if (!url || url.startsWith('N/A')) {
      wx.showToast({ title: '暂无来源链接', icon: 'none' });
      return;
    }
    wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '来源链接已复制', icon: 'none' }) });
  },
});
