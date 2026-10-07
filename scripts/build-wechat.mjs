#!/usr/bin/env node
// src/*.js (ESM) -> wechat/utils/*.js (CommonJS)
// 用法: node scripts/build-wechat.mjs  (在 build-data.mjs 之后运行)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'wechat', 'utils');
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

console.log('wechat/utils/: scoring.js questions.js cities.js 生成完毕');
