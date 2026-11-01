// 九型鸟画像自检: 画像数据 ↔ 剪影 ↔ 小程序 WXSS 三者必须一一对应
// 用法: node test/bird-art.cjs
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { BIRD_ART, BIRD_VIEWBOX, birdSvg } = require(path.join(ROOT, 'src/bird-art.js'));
const { profileOf } = require(path.join(ROOT, 'wechat-manual/utils/scoring.js'));

let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('✅', msg); } else { fail++; console.log('❌', msg); } };

const KEYS = ['0,0', '0,1', '0,2', '1,0', '1,1', '1,2', '2,0', '2,1', '2,2'];
const V = [15, 50, 90];   // 低 / 中 / 高 的代表分数

// ---- 1. 九型全都在, 且都能取到完整文案 ----
const seen = new Set();
for (const [a, l] of KEYS.map((k) => k.split(',').map(Number))) {
  const p = profileOf({ ambition: V[a], lifestyle: V[l], family: 50, economy: 50, risk: 50 });
  const need = ['key', 'name', 'en', 'traits', 'tagline', 'who', 'conflict', 'path'];
  const miss = need.filter((f) => p[f] == null || (Array.isArray(p[f]) ? p[f].length === 0 : String(p[f]).trim() === ''));
  check(p.key === `${a},${l}`, `${a},${l} → ${p.name} (key=${p.key})`);
  check(miss.length === 0, `  ${p.name} 文案字段齐全${miss.length ? ' 缺: ' + miss.join('/') : ''}`);
  check(Array.isArray(p.traits) && p.traits.length === 3, `  ${p.name} 三个习性标签`);
  check(p.name.length === 2, `  ${p.name} 名字是两个字(卡片大字排版)`);
  seen.add(p.name);
}
check(seen.size === 9, `九型名字互不重复 (got ${seen.size})`);

// ---- 2. 每型都有剪影, 且不是同一张 ----
const arts = KEYS.map((k) => BIRD_ART[k]);
check(arts.every((a) => typeof a === 'string' && a.length > 60), '9 型剪影都存在且非空');
check(new Set(arts).size === 9, '9 张剪影互不相同');
check(/^0 0 120 120$/.test(BIRD_VIEWBOX), `viewBox 统一 (${BIRD_VIEWBOX})`);

const svg = birdSvg('1,1', 96);
check(svg.startsWith('<svg') && svg.includes('viewBox="0 0 120 120"'), 'web 内联 svg 结构正确');
check(svg.includes('fill="currentColor"'), 'web 用 currentColor, 颜色交给 CSS');
check(birdSvg('不存在的key').includes(BIRD_ART['1,1']), '未知 key 回退到喜鹊, 不白屏');

// ---- 3. 小程序 WXSS 由构建脚本生成, 与源数据一致 ----
const wxssPath = path.join(ROOT, 'wechat-manual/pages/result/bird-art.wxss');
check(fs.existsSync(wxssPath), 'bird-art.wxss 已生成');
const wxss = fs.readFileSync(wxssPath, 'utf8');
for (const k of KEYS) {
  const cls = '.bird-' + k.replace(',', '');
  check(wxss.includes(cls + '{background-image:url("data:image/svg+xml;base64,'), `wxss 含 ${cls}`);
}
// base64 必须能还原成合法 svg, 且颜色已被替换成实色 (background 里 currentColor 会变黑)
const b64 = (wxss.match(/base64,([A-Za-z0-9+/=]+)/) || [])[1] || '';
const decoded = Buffer.from(b64, 'base64').toString('utf8');
check(decoded.startsWith('<svg') && decoded.includes('xmlns'), 'base64 解码是合法 svg');
check(!decoded.includes('currentColor') && decoded.includes('#F8B500'), '剪影已固化为琥珀色(无 currentColor 残留)');
check(fs.statSync(wxssPath).size < 20 * 1024, `wxss 体积 ${(fs.statSync(wxssPath).size / 1024).toFixed(1)}KB (<20KB)`);

// ---- 4. 结果页模板里鸟和一句话都绑上了 ----
const wxml = fs.readFileSync(path.join(ROOT, 'wechat-manual/pages/result/result.wxml'), 'utf8');
check(wxml.includes('class="pbird {{birdClass}}"'), 'wxml 绑定了 birdClass');
check(wxml.includes('{{profile.name}}'), 'wxml 显示鸟名');
check(wxml.includes('「{{profile.tagline}}」'), 'wxml 显示一句话');
const wcss = fs.readFileSync(path.join(ROOT, 'wechat-manual/pages/result/result.wxss'), 'utf8');
check(wcss.includes('@import "./bird-art.wxss"'), 'result.wxss 引入了剪影样式');
const rjs = fs.readFileSync(path.join(ROOT, 'wechat-manual/pages/result/result.js'), 'utf8');
check(rjs.includes("'bird-' + String(profile.key"), 'result.js 由 key 生成 birdClass');

console.log(fail === 0 ? `\n全部通过 (${pass} 项)` : `\n${fail} 项失败 / ${pass} 项通过`);
process.exit(fail ? 1 : 0);
