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

// ---------- 2. 三磁体画像 (事业×生活 3×3 = 9 型，每型对应一种鸟) ----------
// 选鸟原则: ①习性要能直接翻译成"怎么选城市" ②中国人认得，不用查百科
// key 是分型坐标(事业,生活)，代码里按 key 判断，不按 name（改名不影响逻辑）
const AMB = (v) => v < 40 ? 0 : v > 62 ? 2 : 1;          // 低/中/高
const LIF = (v) => v < 40 ? 0 : v > 62 ? 2 : 1;
const PROFILES = {
  '2,0': { key: '2,0', name: '游隼', en: 'Peregrine Falcon', traits: ['俯冲型', '只看目标', '不计成本'],
    tagline: '俯冲的时候，没人看风景',
    who: '你是把城市当跑道的人：行业浓度、上升速度、同频的人，比什么都重要',
    conflict: '飞得越快越没时间落地——通勤、房价、被压缩的生活都在下面等着',
    path: '去机会密度最高的城市，把生活成本算成飞行成本，认了' },
  '2,1': { key: '2,1', name: '蜂鸟', en: 'Hummingbird', traits: ['高耗能', '会悬停', '不肯将就'],
    tagline: '一边高速振翅，一边记得停在花前',
    who: '你要增长，也不肯把生活全押上：能连轴转，但周末得有自己的那朵花',
    conflict: '悬停最耗能——一线给得起机会给不起喘息，老家反过来',
    path: '新一线强产业城市：八成机会、五成成本，刚好够悬停' },
  '2,2': { key: '2,2', name: '鸿雁', en: 'Wild Goose', traits: ['候鸟型', '远程友好', '成群而行'],
    tagline: '哪季有风就往哪飞，但要飞成一片',
    who: '你两头都不将就：事业要往上，生活要有山海和自由',
    conflict: '这样的地方很少，而且大多要求你远程办公、自己给自己发工资',
    path: '远程友好 + 宜居城市是你的主场，用迁徙换两边都不亏' },
  '1,0': { key: '1,0', name: '麻雀', en: 'Sparrow', traits: ['就地安家', '抗风险', '不远飞'],
    tagline: '不挑城市，只挑稳当',
    who: '你要确定性：一份不会突然消失的工作、一笔算得清的月供',
    conflict: '过度求稳，可能整段错过结构性机会——山那边在长，麻雀飞不过去',
    path: '成熟产业 + 政策稳定的城市，慢慢攒，别赌' },
  '1,1': { key: '1,1', name: '喜鹊', en: 'Magpie', traits: ['爱筑巢', '关系网密', '城中常客'],
    tagline: '事业生活四六开，人情味不能少',
    who: '你在乎发展，也在乎楼下那家面馆、能随时喊出来的朋友',
    conflict: '大城市有效率没人情，小城市有人情没效率，你卡在中间',
    path: '生活成本低 + 社交氛围好的强二线，把"人"当基础设施' },
  '1,2': { key: '1,2', name: '燕子', en: 'Swallow', traits: ['归巢本能', '高铁半径', '家在前'],
    tagline: '飞得再远，屋檐还在老地方',
    who: '家庭是你的重心，但你也需要城市的收入和三甲医院',
    conflict: '离家近和机会多，多数时候只能选一个',
    path: '家乡省会或高铁两小时圈内的强二线，做一只通勤的燕子' },
  '0,0': { key: '0,0', name: '斑鸠', en: 'Spotted Dove', traits: ['低成本安家', '低调', '不折腾'],
    tagline: '安安静静有个窝，比什么都强',
    who: '你把安居看得比一切重：负担得起的生活，才算踏实',
    conflict: '一味压成本，很可能买到资产性最差的那套房',
    path: '房价收入比低的城市，先上车，再谈别的' },
  '0,1': { key: '0,1', name: '鸳鸯', en: 'Mandarin Duck', traits: ['成对安居', '讲体面', '水面慢生活'],
    tagline: '日子要体面，不一定要快',
    who: '工作是为了生活：你要舒服、体面、有点余裕的家',
    conflict: '低成本城市的收入天花板，早晚会让你不甘心',
    path: '宜居中成本城市，用低房价换生活质量' },
  '0,2': { key: '0,2', name: '白鹭', en: 'Egret', traits: ['择水而居', '挑剔环境', '慢养型'],
    tagline: '城市是水塘，我只在干净的地方落脚',
    who: '气候、饮食、文化、自然——城市得先养得住你，你才肯留下',
    conflict: '最养人的地方，往往也是最挣不到钱的地方',
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

// ---------- 4. 城市七维得分 (0-100, 越高越好) ----------
// 大区邻接表 (离家距离用)
const REGION_ADJ = {
  '华北': ['东北', '华东', '西北'],
  '东北': ['华北'],
  '华东': ['华北', '华中', '华南'],
  '华中': ['华东', '华南', '西南', '西北'],
  '华南': ['华东', '华中', '西南'],
  '西南': ['华中', '华南', '西北'],
  '西北': ['华北', '华中', '西南'],
};

// 离家距离分: 同区=100, 相邻=65, 远=30 (F00 未答或"海外/其他"=null, 不参与)
export function regionScore(homeRegion, cityRegion) {
  if (!homeRegion || !cityRegion || homeRegion === '海外 / 其他') return null;
  if (homeRegion === cityRegion) return 100;
  if (REGION_ADJ[homeRegion]?.includes(cityRegion)) return 65;
  return 30;
}

// 数据缺失的维度 → null, 不参与计分 (matchAll 会把权重重归一化)。
// 不用"缺省=50": 那会奖励数据缺失城市、压过有真实短板的城市。
export function cityScores(city, homeRegion) {
  // livability 四项子分: 有数的按固定权重合成, 全缺才整体 null
  const livParts = [];
  if (city.aqi_good_days_ratio != null)        livParts.push(['aqi',   norm(city.aqi_good_days_ratio, 55, 98), 0.35]);
  if (city.avg_commute_minutes != null)        livParts.push(['comm',  100 - norm(city.avg_commute_minutes, 25, 48), 0.25]);
  if (city.tier3_hospitals != null)            livParts.push(['hosp',  norm(city.tier3_hospitals, 5, 65), 0.20]);
  if (city.cultural_facilities_index != null)  livParts.push(['cult',  city.cultural_facilities_index, 0.20]);
  let livability = null;
  if (livParts.length) {
    const wsum = livParts.reduce((s, p) => s + p[2], 0);
    livability = livParts.reduce((s, p) => s + p[1] * (p[2] / wsum), 0);
  }
  // social 两项: 缺项按中性 50 计 (不删权重 — 否则单子项城市吃满双倍项分, 拉萨 365 天产假→social 100)
  let social = null;
  {
    const matern = city.maternity_leave_days != null ? norm(city.maternity_leave_days, 126, 190) : null;  // 158(全国基准)=50
    const pension = city.pension_base_lower != null ? norm(city.pension_base_lower, 3800, 5300) : null;   // 4550=常见下限=50
    if (matern != null || pension != null) social = (matern ?? 50) * 0.5 + (pension ?? 50) * 0.5;
  }
  return {
    // 经济机会 = 工资 + 机会密度 各半 (job_density 37 城全量, 单一工资会低估一线机会优势)
    opportunity: (() => {
      const parts = [];
      if (city.avg_salary_yearly_wan != null) parts.push([norm(city.avg_salary_yearly_wan, 6, 30), 0.5]);
      if (city.job_density_index != null)     parts.push([city.job_density_index, 0.5]);
      if (!parts.length) return null;
      const wsum = parts.reduce((s, p) => s + p[1], 0);
      return parts.reduce((s, p) => s + p[0] * (p[1] / wsum), 0);
    })(),
    housing:     city.price_to_income_ratio != null ? 100 - norm(city.price_to_income_ratio, 5, 26) : null,
    hukou:       100 - (city.hukou_difficulty_score ?? 50),                                            // 37城全覆盖, 不为 null
    livability,                                                                                        // 宜居综合
    social,                                                                                            // 五险一金
    talent:      city.talentBonus ?? 60,                                                               // 人才政策(文字型, 暂给基准)
    family_dist: regionScore(homeRegion, city.region),                                                 // 离家距离(需 F00 校准)
  };
}

// ---------- 5. 动态权重 ----------
// 用户敏感度高的维度权重放大, 反之缩小; 总和恒为 1
export function weightsOf(userDims, answers) {
  const sens = {
    opportunity: 60 + userDims.ambition * 1.2,        // 事业主导: 高事业 180 vs 房价67/落户40, 低事业 60 仍合理
    housing:     100 - userDims.economy,              // 经济基础弱 → 买房难度更敏感
    hukou:       userDims.risk < 40 ? 70 : 40,        // 求稳者更在意落户确定住
    livability:  userDims.lifestyle,
    social:      userDims.family,
    talent:      clamp(100 - userDims.risk, 20, 80),  // 求稳者更吃政策红利
    // 离家距离: 由 F02(理想距离) + F03(父母照护) 动态决定
    family_dist: (() => {
      if (answers == null) return 0;
      const f02 = answers['F02'], f03 = answers['F03'];
      if (f02 == null && f03 == null) return 0;
      // F02: 0=同城最好 1=高铁2小时 2=飞机3小时 3=距离无所谓 (reverse)
      // F03: 0-3 照护需求
      const distPref = f02 == null ? 1.5 : [3, 2, 1, 0][f02];   // 越想离家近权重越大
      const careNeed = f03 == null ? 1.5 : f03;                  // 照护需求 0-3
      return Math.round(distPref * careNeed * 12);              // 0-108 (同城+高照护≈25% 权重)
    })(),
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
  const weights = weightsOf(userDims, answers);
  // F00 家乡校准: 答案索引 → 大区名 (与 questions.json F00 options 对齐)
  const REGIONS = ['华北', '东北', '华东', '华中', '华南', '西南', '西北', '海外 / 其他'];
  const homeRegion = REGIONS[answers['F00'] ?? 7] ?? null;

  // 先算全部城市原始分, 再做"缺维中位数回填": 缺失维度 ≈ 全体已知城市该维中位分 × 0.97
  // (纯跳过会奖励数据缺失的城市 — 它们只在自己最强的维度上被评分; 回填+微折损最公平)
  const raw = CITIES.map(city => ({ city, scores: cityScores(city, homeRegion) }));
  const DIMS = ['opportunity', 'housing', 'hukou', 'livability', 'social', 'talent', 'family_dist'];
  const median = arr => {
    const a = [...arr].sort((x, y) => x - y);
    return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  };
  for (const dim of DIMS) {
    const known = raw.map(r => r.scores[dim]).filter(v => v != null);
    if (!known.length || known.length === raw.length) continue;    // 全缺(如 F00 未答)或无缺失: 不回填
    const fill = median(known) * 0.97;
    for (const r of raw) if (r.scores[dim] == null) r.scores[dim] = fill;
  }
  // family_dist 特例: F00 未答/海外 → 该维整体不参与 (无"全体中位"概念)
  const homeUnset = homeRegion == null;
  if (homeUnset) for (const r of raw) r.scores.family_dist = null;

  const results = raw.map(({ city, scores }) => {
    // family_dist 为 null (未答 F00 / 海外) 时该维度跳过, 权重重新归一化
    const active = Object.keys(weights).filter(k => scores[k] != null);
    const wsum = active.reduce((s, k) => s + weights[k], 0) || 1;
    let m = 0;
    for (const k of active) m += scores[k] * (weights[k] / wsum);
    // 画像微调(±3): 鸿雁(事业高+生活高)偏宜居, 游隼(事业高+生活低)偏机会
    // 用 key 而非 name 判断, 改画像名/文案不会悄悄失效
    if (profile.key === '2,2') m += (scores.livability - 60) * 0.05;
    if (profile.key === '2,0') m += (scores.opportunity - 60) * 0.05;
    const filterReasons = filterCity(city, userDims, answers, questions);
    return { city, match: Math.round(clamp(m, 0, 100)), scores, filterReasons };
  });

  // 被过滤的城市排后并标注
  results.sort((a, b) => {
    const fa = a.filterReasons.length ? 1 : 0, fb = b.filterReasons.length ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return b.match - a.match;
  });
  return { userDims, profile, weights, results };
}
