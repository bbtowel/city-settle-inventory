#!/usr/bin/env node
// src/*.js (ESM) -> wechat-manual/utils/*.js (CommonJS)
// 用法: node scripts/build-wechat.mjs  (在 build-data.mjs 之后运行)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BIRD_ART, BIRD_VIEWBOX } from '../src/bird-art.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'wechat-manual', 'utils');
mkdirSync(OUT, { recursive: true });

// ---- scoring.js: import -> require, export function -> function, 尾部追加 module.exports ----
let s = readFileSync(join(ROOT, 'src/scoring.js'), 'utf8');
s = s.replace(/^import\s*\{[^}]*\}\s*from\s*'\.\/cities\.js';.*$/m,
              "const { CITIES } = require('./cities.js');");
s = s.replace(/^export function (\w+)/gm, 'function $1');
s += '\nmodule.exports = { scoreUser, profileOf, filterCity, budgetOf, regionScore, cityScores, weightsOf, matchAll };\n';
writeFileSync(join(OUT, 'scoring.js'), s);

// ---- questions.js ----
let q = readFileSync(join(ROOT, 'src/questions.js'), 'utf8');
q = q.replace(/^export const (\w+)/gm, 'const $1');
q += '\nmodule.exports = { QUESTIONS, DIMENSIONS };\n';
writeFileSync(join(OUT, 'questions.js'), q);

// ---- cities.js ----
let c = readFileSync(join(ROOT, 'src/cities.js'), 'utf8');
c = c.replace(/^export const (\w+)/gm, 'const $1');
c += '\nmodule.exports = { CITIES };\n';
writeFileSync(join(OUT, 'cities.js'), c);

// ---- bird-art.js: 九型鸟剪影 -> 结果页 WXSS (小程序 WXML 不能内联 svg, 转 base64 背景图) ----
const birds = Object.entries(BIRD_ART).map(([key, art]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BIRD_VIEWBOX}" fill="#F8B500">${art.replace(/currentColor/g, '#F8B500')}</svg>`;
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `.bird-${key.replace(',', '')}{background-image:url("data:image/svg+xml;base64,${b64}")}`;
}).join('\n');
writeFileSync(
  join(ROOT, 'wechat-manual/pages/result/bird-art.wxss'),
  `/* 由 scripts/build-wechat.mjs 生成, 勿手改 \u2014 源文件 src/bird-art.js */\n${birds}\n`
);

console.log('wechat-manual/utils/: scoring.js questions.js cities.js 生成完毕');
console.log('wechat-manual/pages/result/bird-art.wxss: 9 型剪影生成完毕');
