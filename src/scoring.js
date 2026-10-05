// 「归巢」匹配引擎 — 四步: 过滤 → 归一化 → 动态加权 → 排序
// 数值全部来自 data/cities/*.json (双源交叉验证), LLM 只解释不计算
import { CITIES } from './cities.js';

// ---------- 工具 ----------
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const norm = (x, lo, hi) => clamp((x - lo) / (hi - lo), 0, 1) * 100;

// ---------- 1. 用户五维得分 (答题 1-4 → 0-100) ----------
// answers: { [questionId]: 0..3 选项索引 }
export function scoreUser(answers, questions) {
  const sums = { ambition: 0, lifestyle: 0, family: 0, economy: 0, risk: 0 };
  const counts = { ambition: 0, lifestyle: 0, family: 0, economy: 0, risk: 0 };

  for (const q of questions) {
    const idx = answers[q.id];
    if (idx == null) continue;
    let s = q.options.length === 4 ? idx + 1 : idx + 1; // 1-4
    if (q.reverse) s = 5 - s;
    sums[q.dimension] += s;
    counts[q.dimension] += 1;
  }
  const dims = {};
  for (const d of Object.keys(sums)) {
    dims[d] = counts[d] ? Math.round(((sums[d] / (counts[d] * 4)) - 0.25) * 100 / 0.75) : 50;
    // 4题全1→0分, 全4→100分, 线性
    dims[d] = clamp(dims[d], 0, 100);
  }
  return dims; // {ambition:0-100, ...}
}

// ---------- 2. 三磁体画像 (事业×生活 3×3 = 9 型) ----------
const AMB = (v) => v < 40 ? 0 : v > 62 ? 2 : 1;          // 低/中/高
const LIF = (v) => v < 40 ? 0 : v > 62 ? 2 : 1;
const PROFILES = {
  '2,0': { name: '开拓者', tagline: '先征服一座城，再考虑生活',
    who: '你要的是行业最前沿的浓度和向上通道', conflict: '但城市的代价是通勤、房价和挤压掉的生活',
    path: '去机会密度最高的城市，把生活成本当投资' },
  '2,1': { name: '闯将', tagline: '机会是主线，但不打算押上全部',
    who: '你既要增长也要基本的生活质量', conflict: '一线太挤、老家太小，你在找中间态',
    path: '新一线强产业城市能给你 80% 的机会和 50% 的成本' },
  '2,2': { name: '游牧者', tagline: '要事业也要山海，哪里值得去哪里',
    who: '你拒绝为城市牺牲任何一头', conflict: '这样的城市少，且往往要求你远程或自由职业',
    path: '远程友好 + 宜居城市是你的主场' },
  '1,0': { name: '平衡家', tagline: '稳定压倒一切，城市为职业服务',
    who: '你要的是确定性：稳定的工作、可控的成本', conflict: '过度求稳可能错过结构性机会',
    path: '选成熟产业 + 政策稳定的城市' },
  '1,1': { name: '织网者', tagline: '事业生活四六开，人情味不能少',
    who: '你在乎职业发展，也在乎朋友、烟火气和归属感', conflict: '大城市效率与人情难两全',
    path: '生活成本低 + 社交氛围好的强二线' },
  '1,2': { name: '回归者', tagline: '父母在不远游，但县城回不去',
    who: '家庭是你的重心，但你需要城市的收入和医疗', conflict: '离家近与机会多经常冲突',
    path: '家乡省会或高铁圈内的强二线' },
  '0,0': { name: '织巢者', tagline: '房子是巢，能住就行，别谈理想',
    who: '你把安居看得比一切重，能负担的生活才踏实', conflict: '过度控制成本可能牺牲长期资产性',
    path: '房价收入比低的城市，早日上车' },
  '0,1': { name: '守望者', tagline: '生活大于事业，但要个像样的家',
    who: '工作是为了生活，你要的是舒适与体面的平衡', conflict: '低成本城市的收入天花板可能让你不甘',
    path: '宜居中成本城市，用低房价换生活质量' },
  '0,2': { name: '园丁', tagline: '城市是花园，我只是来种花的',
    who: '气候、饮食、文化、自然——你的城市必须养人', conflict: '最宜居的地方往往收入有限',
    path: '把钱花在生活方式上，而不是资产上' },
};

export function profileOf(userDims) {
  return PROFILES[`${AMB(userDims.ambition)},${LIF(userDims.lifestyle)}`] || PROFILES['1,1'];
}

// ---------- 3. 硬性过滤 ----------
// 返回 {city, reasons: []} reasons 非空 = 被过滤
export function filterCity(city, userDims, answers, questions) {
  const reasons = [];
  const budget = budgetOf(answers, questions);          // 万元 (E01+F06 合并)
  if (budget != null && city.downpayment_median_wan != null) {
    if (budget < city.downpayment_median_wan * 0.8) {
      reasons.push(`首付预算紧张（需约 ${city.downpayment_median_wan} 万，你约 ${budget} 万）`);
    }
  }
  // 家庭约束: 父母距离需求高(F02≤1) 但城市远离中原/人口大省 → 仅提示不排除
  return reasons;
}

// E01 首付区间(0-20/20-50/50-100/100+) + F06 家庭支持(0/10/10-30/30+)
// 取区间上限而非中值: E01=0 → 20万 (宁可放过, 不可错杀)
export function budgetOf(answers, questions) {
  const e01 = answers['E01'], f06 = answers['F06'];
  if (e01 == null) return null;
  const own = [20, 50, 100, 150][e01] ?? null;           // 区间上限
  const fam = f06 == null ? 0 : [0, 10, 30, 50][f06] ?? 0;
  return own == null ? null : own + fam;
}

// ---------- 4. 城市六维得分 (0-100, 越高越好) ----------
export function cityScores(city) {
  return {
    opportunity: norm(city.avg_salary_yearly_wan || 0, 6, 24),        // 经济机会
    housing:     100 - norm(city.price_to_income_ratio || 30, 5, 26), // 买房难度(反向)
    hukou:       100 - (city.hukou_difficulty_score ?? 50),           // 落户易度
    livability:  norm(city.aqi_good_days_ratio || 0, 55, 98) * 0.35
               + (100 - norm(city.avg_commute_minutes || 50, 25, 48)) * 0.25
               + norm(city.tier3_hospitals || 0, 5, 65) * 0.20
               + (city.cultural_facilities_index || 50) * 0.20,       // 宜居综合
    social:      norm(city.maternity_leave_days || 158, 150, 190) * 0.5
               + (city.pension_base_lower ? norm(city.pension_base_lower, 3800, 7600) * 0.5 : 50), // 五险一金
    talent:      city.talentBonus ?? 60,                              // 人才政策(文字型, 暂给基准)
  };
}

// ---------- 5. 动态权重 ----------
// 用户敏感度高的维度权重放大, 反之缩小; 总和恒为 1
export function weightsOf(userDims) {
  const sens = {
    opportunity: 30 + userDims.ambition * 0.9,        // 基础 30 + 事业心放大
    housing:     100 - userDims.economy,              // 经济基础弱 → 买房难度更敏感
    hukou:       userDims.risk < 40 ? 70 : 40,        // 求稳者更在意落户确定住
    livability:  userDims.lifestyle,
    social:      userDims.family,
    talent:      clamp(100 - userDims.risk, 20, 80),  // 求稳者更吃政策红利
  };
  const total = Object.values(sens).reduce((a, b) => a + b, 0);
  const w = {};
  for (const k of Object.keys(sens)) w[k] = sens[k] / total;
  return w;
}

// ---------- 6. 匹配度 + 排序 ----------
export function matchAll(answers, questions) {
  const userDims = scoreUser(answers, questions);
  const profile = profileOf(userDims);
  const weights = weightsOf(userDims);

  const results = CITIES.map(city => {
    const scores = cityScores(city);
    const dims6 = { opportunity: scores.opportunity, housing: scores.housing,
                    hukou: scores.hukou, livability: scores.livability,
                    social: scores.social, talent: scores.talent };
    let m = 0;
    for (const k of Object.keys(dims6)) m += dims6[k] * (weights[k] || 0);
    // 画像微调: 游牧者偏好宜居, 开拓者偏好机会 (±3)
    if (profile.name === '游牧者') m += (dims6.livability - 60) * 0.05;
    if (profile.name === '开拓者') m += (dims6.opportunity - 60) * 0.05;
    const filterReasons = filterCity(city, userDims, answers, questions);
    return { city, match: Math.round(clamp(m, 0, 100)), scores: dims6, filterReasons };
  });

  // 被过滤的城市排后并标注
  results.sort((a, b) => {
    const fa = a.filterReasons.length ? 1 : 0, fb = b.filterReasons.length ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return b.match - a.match;
  });
  return { userDims, profile, weights, results };
}
