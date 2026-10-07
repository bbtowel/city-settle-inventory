// 答题页
const app = getApp();
const { QUESTIONS } = require('../../utils/questions.js');
const DIM_NAME = { ambition: '事业雄心', lifestyle: '生活偏好', family: '家庭因素', economy: '经济基础', risk: '风险态度' };

Page({
  data: { idx: 0, total: 0, progress: 0, q: null, dimName: '', selected: null, options: [] },

  onLoad() {
    // 从第一道未答的题开始
    let start = QUESTIONS.findIndex(q => app.answers[q.id] == null);
    if (start === -1) start = QUESTIONS.length;
    this.setData({ total: QUESTIONS.length });
    this.show(start);
  },

  show(idx) {
    if (idx >= QUESTIONS.length) {
      wx.redirectTo({ url: '/pages/result/result' });
      return;
    }
    const q = QUESTIONS[idx];
    this.setData({
      idx, q, options: q.options, dimName: DIM_NAME[q.dimension] || '',
      selected: app.answers[q.id] ?? null,
      progress: Math.round((idx / QUESTIONS.length) * 100),
    });
  },

  pick(e) {
    const i = +e.currentTarget.dataset.i;
    app.saveAnswer(this.data.q.id, i);
    this.setData({ selected: i });
    setTimeout(() => this.show(this.data.idx + 1), 180);
  },

  back() { if (this.data.idx > 0) this.show(this.data.idx - 1); },
  next() { if (this.data.selected != null) this.show(this.data.idx + 1); },
});
