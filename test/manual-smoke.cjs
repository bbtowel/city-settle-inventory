// 手册小程序冒烟测试: node test/manual-smoke.cjs (CJS — wechat-manual/utils 是 CommonJS)
// 校验: cities.js 结构 / index/city/compare 页面逻辑
const { CITIES, SRC_TITLE } = require('../wechat-manual/utils/manual-cities.js');

let fail = 0;
const check = (cond, msg) => { if (!cond) { console.log('❌', msg); fail++; } };

// 1) 数据完整: 37 城, 每城 6 维度
check(CITIES.length === 37, `城市数应为37, 实得 ${CITIES.length}`);
const DIM_KEYS = ['economy_opportunity', 'housing_difficulty', 'hukou_policy', 'social_insurance', 'livability', 'talent_policy'];
for (const c of CITIES) {
  check(c.name && c.pinyin && c.tier, `城市基础字段缺失: ${JSON.stringify(c.name)}`);
  check(c.dims.length === 6, `${c.name} 维度数 ${c.dims.length} != 6`);
  const keys = c.dims.map(d => d.key);
  for (const k of DIM_KEYS) check(keys.includes(k), `${c.name} 缺维度 ${k}`);
  const totalFields = c.dims.reduce((s, d) => s + d.fields.length, 0);
  check(totalFields >= 28, `${c.name} 字段数过少: ${totalFields}`);
  for (const d of c.dims)
    for (const f of d.fields)
      check(f.label && f.key, `${c.name}/${d.key} 字段缺 label/key: ${f.key}`);
}

// 2) index 页过滤逻辑 (模拟)
const tiers = ['all', '一线', '新一线', '二线', '三线', '四线', '五线'];
for (const t of tiers) {
  const n = CITIES.filter(c => t === 'all' || c.tier === t).length;
  if (t !== 'all') check(n >= 1, `层级 ${t} 应有城市, 实得 ${n}`);
  console.log(`  ${t}: ${n} 城`);
}

// 3) compare bestOf 逻辑 (复制自 compare.js)
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
check(bestOf('avg_salary_yearly', [12, 20, 8]) === 1, 'salary 最高应胜');
check(bestOf('price_to_income_ratio', [8, 18, 5]) === 2, 'pti 最低应胜');
check(bestOf('avg_price_per_sqm', [9000, 20000, 5000]) === 2, 'price 最低应胜');
check(bestOf('hukou_difficulty_score', [90, 15, 50]) === 1, '落户难度最低应胜');
check(bestOf('maternity_leave_days', [158, 188, 365]) === 2, '产假最长应胜');
check(bestOf('avg_salary_yearly', [null, null, null]) === -1, '全null不标优');
check(bestOf('avg_salary_yearly', [null, 10, null]) === 1, '单值该胜');
check(bestOf('purchase_restrictions', ['不限购', '户籍+1年']) === -1, '字符串字段不标优');
check(bestOf('avg_price_per_sqm', ['12799（部分口径）', 5000]) === 1, '字符串数字可解析');

// 4) 模拟 3 城对比矩阵构建
function buildMatrix(picked) {
  const matrix = [];
  const DIM_ORDER = picked[0].dims.map(d => ({ key: d.key, name: d.name }));
  for (const d of DIM_ORDER) {
    const fields = picked[0].dims.find(x => x.key === d.key).fields;
    const rows = [];
    for (const f of fields) {
      const vals = picked.map(c => {
        const cd = c.dims.find(x => x.key === d.key);
        const cf = cd ? cd.fields.find(x => x.key === f.key) : null;
        return cf ? cf.value : null;
      });
      rows.push({ key: f.key, best: bestOf(f.key, vals) });
    }
    matrix.push({ dimKey: d.key, rows });
  }
  return matrix;
}
const trio = ['beijing', 'chengdu', 'changsha'].map(p => CITIES.find(c => c.pinyin === p));
check(trio.every(Boolean), '三城查找失败');
const mx = buildMatrix(trio);
check(mx.length === 6, `矩阵维度 ${mx.length} != 6`);
const salaryRow = mx.find(d => d.dimKey === 'economy_opportunity').rows.find(r => r.key === 'avg_salary_yearly');
check(salaryRow.best === 0, `三城对比 salary 最优应为北京(index 0), 实得 ${salaryRow.best}`);
const ptiRow = mx.find(d => d.dimKey === 'housing_difficulty').rows.find(r => r.key === 'price_to_income_ratio');
check(ptiRow.best === 2, `pti 最优应为长沙(index 2), 实得 ${ptiRow.best}`);

// 5) 字段覆盖抽查: 文化指数在 19/37 城已客观化
const anchored = CITIES.filter(c => {
  const f = c.dims.find(d => d.key === 'livability').fields.find(x => x.key === 'cultural_facilities_index');
  return f && f.unit && f.unit.includes('客观公式');
});
check(anchored.length === 19, `culture 锚定应19城, 实得 ${anchored.length}`);
console.log(`  culture 客观化: ${anchored.length}/37`);

// 6) 来源链接抽查: 长沙平均工资应有 src
const cs = CITIES.find(c => c.pinyin === 'changsha');
const csSalary = cs.dims[0].fields.find(f => f.key === 'avg_salary_yearly');
check(csSalary.src && csSalary.src.startsWith('http'), `长沙 salary src 缺失: ${csSalary.src}`);
check(typeof SRC_TITLE === 'string' && SRC_TITLE.length > 0, 'SRC_TITLE 导出缺失');

console.log(fail === 0 ? '\n✅ 手册冒烟测试全部通过' : `\n❌ ${fail} 项失败`);
process.exit(fail === 0 ? 0 : 1);
