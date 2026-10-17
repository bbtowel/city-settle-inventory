#!/usr/bin/env node
// data/*.json -> src/*.js 数据模块生成器
// 用法: node scripts/build-data.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function num(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const m = String(v).match(/^\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

// 城市 j 所在大区 (与 F00 校准题选项对齐; 覆盖全部 37 城)
const CITY_REGION = {
  // 直辖市
  '北京': '华北', '上海': '华东', '天津': '华北', '重庆': '西南',
  // 华北
  '石家庄': '华北', '太原': '华北', '呼和浩特': '华北',
  // 东北
  '沈阳': '东北', '长春': '东北', '哈尔滨': '东北',
  // 华东 (江西家乡用户按 F00 口径归华中, 故南昌划华中)
  '南京': '华东', '杭州': '华东', '合肥': '华东', '福州': '华东', '济南': '华东',
  '苏州': '华东', '宁波': '华东', '青岛': '华东',
  // 华中
  '郑州': '华中', '武汉': '华中', '长沙': '华中', '南昌': '华中',
  // 华南
  '广州': '华南', '深圳': '华南', '南宁': '华南', '海口': '华南', '东莞': '华南', '佛山': '华南',
  // 西南
  '成都': '西南', '贵阳': '西南', '昆明': '西南', '拉萨': '西南',
  // 西北
  '西安': '西北', '兰州': '西北', '西宁': '西北', '银川': '西北', '乌鲁木齐': '西北',
};

// questions
const q = JSON.parse(readFileSync(join(ROOT, 'data/questions.json'), 'utf8'));
let js = '// 自动生成: data/questions.json -> src/questions.js (勿手改)\n';
js += 'export const QUESTIONS = ' + JSON.stringify(q.questions, null, 2) + ';\n';
js += 'export const DIMENSIONS = ' + JSON.stringify(q.dimensions, null, 2) + ';\n';
writeFileSync(join(ROOT, 'src/questions.js'), js);
console.log('src/questions.js:', q.questions.length, '题');

// cities
const dir = join(ROOT, 'data/cities');
const files = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
const rows = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const dim = d.dimensions;
  rows.push({
    name: d.city, pinyin: d.city_pinyin, tier: d.tier,
    avg_salary_yearly_wan: num(dim.economy_opportunity.avg_salary_yearly.value),
    job_density_index: num(dim.economy_opportunity.job_density_index.value),
    key_industries: Array.isArray(dim.economy_opportunity.key_industries.value) ? dim.economy_opportunity.key_industries.value : [],
    avg_price_per_sqm: num(dim.housing_difficulty.avg_price_per_sqm.value),
    price_to_income_ratio: num(dim.housing_difficulty.price_to_income_ratio.value),
    downpayment_median_wan: num(dim.housing_difficulty.downpayment_median.value),
    purchase_restrictions_text: String(dim.housing_difficulty.purchase_restrictions.value).slice(0, 200),
    mortgage_rate_first: num(dim.housing_difficulty.mortgage_rate_first.value),
    hukou_difficulty_score: num(dim.hukou_policy.hukou_difficulty_score.value),
    social_security_years_required: num(dim.hukou_policy.social_security_years_required.value),
    pension_base_lower: num(dim.social_insurance.pension_base_lower.value),
    maternity_leave_days: num(dim.social_insurance.maternity_leave_days.value),
    region: CITY_REGION[d.city] || null,
    avg_commute_minutes: num(dim.livability.avg_commute_minutes.value),
    tier3_hospitals: num(dim.livability.tier3_hospitals.value),
    aqi_good_days_ratio: num(dim.livability.aqi_good_days_ratio.value),
    climate_summary: String(dim.livability.climate_summary.value).slice(0, 100),
    cultural_facilities_index: num(dim.livability.cultural_facilities_index.value),
    education_resources: String(dim.livability.education_resources.value).slice(0, 120),
    talent_policy_note: String(dim.talent_policy.fresh_grad_subsidy.value).slice(0, 150),
    rent_subsidy_note: String(dim.talent_policy.rent_subsidy.value).slice(0, 120),
  });
}
let out = '// 自动生成: data/cities/*.json -> src/cities.js (勿手改)\n';
out += 'export const CITIES = ' + JSON.stringify(rows, null, 2) + ';\n';
writeFileSync(join(ROOT, 'src/cities.js'), out);
console.log('src/cities.js:', rows.length, '城');
