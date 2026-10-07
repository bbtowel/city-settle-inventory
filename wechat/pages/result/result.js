// 结果页: 画像 + 五维 + Top3 + 分享
const app = getApp();
const { matchAll } = require('../../utils/scoring.js');
const { QUESTIONS } = require('../../utils/questions.js');

const W = { opportunity: '经济机会', housing: '买房难度', hukou: '落户易度', livability: '宜居条件', social: '五险一金', talent: '人才政策', family_dist: '离家近' };
const DIM = { ambition: '事业雄心', lifestyle: '生活偏好', family: '家庭因素', economy: '经济基础', risk: '风险态度' };
const fmt = n => (n == null || Number.isNaN(n)) ? '—' : Math.round(n * 1000) / 1000;

Page({
  data: { profile: null, dims: [], top3: [], sharePath: '' },

  onLoad() {
    const { userDims, profile, results } = matchAll(app.answers, QUESTIONS);
    const top3 = results.slice(0, 3).map((r, i) => ({
      rank: i + 1, name: r.city.name, tier: r.city.tier, match: r.match,
      meta: `房价 ${fmt(r.city.avg_price_per_sqm)} 元/m² · 收入比 ${fmt(r.city.price_to_income_ratio)} 倍 · 落户难度 ${r.city.hukou_difficulty_score}/100`,
      chips: Object.entries(W).map(([k, n]) => r.scores[k] == null ? null : { n, v: fmt(r.scores[k]) }).filter(Boolean),
      warn: r.filterReasons.join('；') || null,
    }));
    const dims = Object.entries(DIM).map(([k, n]) => ({ n, v: userDims[k] }));
    this.setData({ profile, dims, top3 });
    this._result = { profile, top3names: top3.map(t => t.name) };
  },

  onShareAppMessage() {
    const p = this.data.profile || { name: '归巢' };
    return {
      title: `我是「${p.name}」— 测测你该在哪座城市扎根`,
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    const p = this.data.profile || { name: '归巢' };
    return { title: `我是「${p.name}」— 归巢城市定居测评` };
  },

  shareCard() {
    // 保存画像卡到相册 (用户手动转发或截图)
    wx.setClipboardData({
      data: `【归巢】我是「${this.data.profile.name}」: ${this.data.profile.tagline}。最适合我的城市: ${this.data.top3.map(t => t.name).join('、')}。来测测你的 →`,
      success: () => wx.showToast({ title: '文案已复制', icon: 'success' }),
    });
  },

  restart() {
    app.reset();
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
