// 算法冒烟测试: node test/smoke.mjs (需 Node 18+)
// 模拟 5 类典型用户, 验证画像判定与 Top3 合理性
import { matchAll } from '../src/scoring.js';
import { QUESTIONS } from '../src/questions.js';

function mkAnswers(fn) {
  const a = {};
  for (const q of QUESTIONS) a[q.id] = fn(q);
  return a;
}

// 5 类用户: 通过选择每题选项索引构造
const users = {
  '拼劲闯一线(高事业低生活)': mkAnswers(q => {
    if (q.dimension === 'ambition') return q.reverse ? 0 : 3;    // 高分
    if (q.dimension === 'lifestyle') return q.reverse ? 3 : 0;   // 低分
    return 1; // 其他维中低
  }),
  '生活优先躺平(低事业高生活)': mkAnswers(q => {
    if (q.dimension === 'ambition') return q.reverse ? 3 : 0;    // 低分
    if (q.dimension === 'lifestyle') return q.reverse ? 0 : 3;   // 高分
    if (q.dimension === 'economy') return 0;                     // 低预算(0-20万首付)
    return 1;
  }),
  '家庭型中年(高家庭)': mkAnswers(q => {
    if (q.dimension === 'family') return 3;
    if (q.id === 'E01') return 2;   // 50-100万首付
    return 2;
  }),
  '数字游民(高风险高生活)': mkAnswers(q => {
    if (q.dimension === 'risk') return 3;
    if (q.dimension === 'lifestyle') return q.reverse ? 0 : 3;
    if (q.dimension === 'ambition') return 2;
    return 1;
  }),
  '求稳考公型(低风险)': mkAnswers(q => {
    if (q.dimension === 'risk') return 0;
    if (q.id === 'R02') return 0;   // 不可远程
    return 2;
  }),
};

let fail = 0;
for (const [name, answers] of Object.entries(users)) {
  const { userDims, profile, results } = matchAll(answers, QUESTIONS);
  const top3 = results.slice(0, 3).map(r => `${r.city.name}(${r.match}${r.filterReasons.length ? '⚠' : ''})`).join(' ');
  console.log(`\n【${name}】`);
  console.log(`  画像: ${profile.name} — ${profile.tagline}`);
  console.log(`  五维: 事业${userDims.ambition} 生活${userDims.lifestyle} 家庭${userDims.family} 经济${userDims.economy} 风险${userDims.risk}`);
  console.log(`  Top3: ${top3}`);

  // 基本断言
  if (!profile.name || !profile.tagline) { console.log('  ❌ 画像缺失'); fail++; }
  for (const r of results) {
    if (!(r.match >= 0 && r.match <= 100)) { console.log(`  ❌ ${r.city.name} 匹配度越界: ${r.match}`); fail++; }
  }
}

// 特定断言
const t1 = matchAll(users['拼劲闯一线(高事业低生活)'], QUESTIONS);
if (!['北京', '上海', '深圳'].some(c => t1.results.slice(0, 2).map(r => r.city.name).includes(c))) {
  console.log('\n⚠ 高事业用户 Top2 无一线, 检查机会权重'); fail++;
}
const t2 = matchAll(users['生活优先躺平(低事业高生活)'], QUESTIONS);
if (!t2.results.slice(0, 3).map(r => r.city.name).includes('长沙')) {
  console.log('\n⚠ 低预算高生活用户 Top3 无长沙, 检查'); fail++;
}
// 低预算用户应触发深圳/上海/北京的预算警告
const warned = t2.results.filter(r => r.filterReasons.length).map(r => r.city.name);
console.log(`\n低预算用户被过滤城市: ${warned.join(' ') || '(无)'}`);
if (!warned.some(c => ['北京', '上海', '深圳'].includes(c))) {
  console.log('❌ 预算过滤未生效于一线'); fail++;
}

console.log(fail === 0 ? '\n✅ 全部冒烟测试通过' : `\n❌ ${fail} 项失败`);
process.exit(fail === 0 ? 0 : 1);
