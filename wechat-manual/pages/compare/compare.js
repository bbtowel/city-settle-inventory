// 对比页 — 最多 3 城并排, 维度→字段矩阵, 数值最优高亮
const { CITIES } = require('../../utils/manual-cities.js');
const app = getApp();

Page({
  data: {
    cities: [],      // 已选城市对象数组 (1-3)
    matrix: [],      // [{dimKey, dimName, rows: [{label, key, vals:[v1,v2,v3], units:[...], best:-1}]}]
    isEmpty: true,   // 空态标记: 在 JS 里算好, WXML 不做比较 (避免 < 被模板解析器截断导致分支失效)
    slots: 3,
  },

  onShow() {
    this.build();
  },

  build() {
    const picked = (app.compare || [])
      .map(p => CITIES.find(c => c.pinyin === p))
      .filter(Boolean);
    const matrix = [];
    // 兜底: 取第一个结构完整的城市作为维度基准, 避免某个城市缺 dims 时整页白屏
    const base = picked.find(c => Array.isArray(c.dims) && c.dims.length) || null;
    if (picked.length >= 2 && base) {
      const DIM_ORDER = base.dims.map(d => ({ key: d.key, name: d.name }));
      for (const d of DIM_ORDER) {
        const baseDim = base.dims.find(x => x.key === d.key);
        const fields = (baseDim && baseDim.fields) || [];
        const rows = [];
        for (const f of fields) {
          const vals = picked.map(c => {
            const cd = (c.dims || []).find(x => x.key === d.key);
            const cf = cd ? cd.fields.find(x => x.key === f.key) : null;
            return cf ? cf.value : null;
          });
          const units = picked.map(c => {
            const cd = (c.dims || []).find(x => x.key === d.key);
            const cf = cd ? cd.fields.find(x => x.key === f.key) : null;
            return cf ? cf.unit : '';
          });
          rows.push({ label: f.label, key: f.key, vals, units, best: bestOf(f.key, vals) });
        }
        matrix.push({ dimKey: d.key, dimName: d.name, rows });
      }
    }
    this.setData({ cities: picked, matrix, isEmpty: picked.length < 2 });
  },

  remove(e) {
    const pinyin = e.currentTarget.dataset.pinyin;
    app.toggleCompare(pinyin);
    this.build();
  },

  goPick() {
    wx.switchTab({ url: '/pages/manual-home/index' });
  },
});

// 数值最优判定: 只对已知数值型字段生效, 非数值/字符串不参与
const LOWER_BETTER = ['price_to_income_ratio', 'downpayment_median', 'hukou_difficulty_score',
  'avg_commute_minutes', 'mortgage_rate_first', 'pension_base_lower', 'avg_price_per_sqm',
  'social_security_years_required', 'unemployment_rate'];
const NUMERIC = new Set(['avg_salary_yearly', 'job_density_index', 'unemployment_rate',
  'price_to_income_ratio', 'downpayment_median', 'avg_price_per_sqm', 'mortgage_rate_first',
  'social_security_years_required', 'hukou_difficulty_score', 'pension_base_lower',
  'pension_base_upper', 'maternity_leave_days', 'avg_commute_minutes', 'tier3_hospitals',
  'aqi_good_days_ratio', 'cultural_facilities_index']);
function bestOf(key, vals) {
  if (!NUMERIC.has(key)) return -1;
  const nums = vals.map(v => {
    if (v == null) return null;
    const m = String(v).match(/^\s*([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  });
  if (nums.every(n => n == null)) return -1;
  const lower = LOWER_BETTER.includes(key);
  let best = -1, bestV = lower ? Infinity : -Infinity;
  nums.forEach((n, i) => {
    if (n == null) return;
    if ((lower && n < bestV) || (!lower && n > bestV)) { bestV = n; best = i; }
  });
  return best;
}
