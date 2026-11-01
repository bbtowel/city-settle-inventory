// 小程序静态绑定检查: WXML ↔ JS 一致性
//
// 微信开发者工具只在真机/编译时才报「未定义」, 很多绑定错误在模拟器里看不出来。
// 这个脚本做纯静态扫描, 覆盖四类问题:
//   1. 事件绑定函数在 Page 里不存在 (bindtap="foo" 但没写 foo)
//   2. 模板里引用的变量在 data / setData 里都没出现过 (如写成 {{t}} 而实际是 {{item}})
//   3. app.json 声明的页面文件缺失
//   4. tabBar 指向了未注册的页面
//
// 用法: node test/wechat-bind.cjs

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WX = path.join(ROOT, 'wechat-manual');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('✅', m); };
const bad = (m) => { fail++; console.log('❌', m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

// ---------- 工具 ----------

/**
 * 把字符串内容与注释替换成等长空格 (保留换行, 下标不变)。
 * 不这么做的话, 注释里的逗号/括号会把对象字面量的分段和配对整个带偏,
 * 导致注释后面那个键被静默漏掉 —— 这正是本脚本第一版误报的原因。
 */
function mask(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '/') {                    // 行注释
      while (i < n && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && c2 === '*') {                    // 块注释
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {        // 字符串: 引号保留, 内容抹平
      const q = c;
      out += q; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' '; i++;
      }
      if (i < n) { out += q; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** 去掉模板表达式里的字符串字面量, 避免把中文/英文句子当成变量名 */
function stripStrings(s) {
  return mask(s);
}

/** 抓出 WXML 里所有 {{ ... }} 表达式 */
function exprs(src) {
  const out = [];
  const re = /\{\{([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

/** 事件绑定: bindtap="fn" / catchtap="fn" / bind:tap="fn" / capture-bind:tap="fn" */
function handlers(src) {
  const out = [];
  const re = /(?:capture-)?(?:bind|catch|mut-bind):?([a-z]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const fn = m[2].trim();
    if (!fn || fn.includes('{{')) continue;   // 动态绑定跳过
    out.push(fn);
  }
  return out;
}

/** 收集 wx:for 产生的作用域变量名 (默认 item/index, 以及 wx:for-item / wx:for-index) */
function loopVars(src) {
  const vars = new Set(['item', 'index']);
  const re = /wx:for-(item|index)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) vars.add(m[2].trim());
  return vars;
}

/** 从 JS 源码里取 Page({ data: {...} }) 的键 + 所有 setData({...}) 的键 */
function declaredKeys(jsRaw) {
  const js = mask(jsRaw);                          // 先抹掉注释/字符串, 括号配对才准
  const keys = new Set();
  // data: { ... } —— 取第一层键
  const dataM = js.match(/\bdata\s*:\s*\{/);
  if (dataM) {
    const start = dataM.index + dataM[0].length - 1;
    let depth = 0, end = start;
    for (let i = start; i < js.length; i++) {
      if (js[i] === '{') depth++;
      else if (js[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    collectTopKeys(js.slice(start + 1, end), keys);
  }
  // setData({ ... }) / setData({ a, b, c })
  const re = /setData\s*\(\s*\{/g;
  let m;
  while ((m = re.exec(js))) {
    const start = m.index + m[0].length - 1;
    let depth = 0, end = start;
    for (let i = start; i < js.length; i++) {
      if (js[i] === '{') depth++;
      else if (js[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    collectTopKeys(js.slice(start + 1, end), keys);
  }
  return keys;
}

/** 从对象字面量正文里抓第一层键名 (支持 key: v / key, / 'key': v / 展开 ...x 忽略) */
function collectTopKeys(body, out) {
  let depth = 0;
  let seg = '';
  const segs = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) { segs.push(seg); seg = ''; continue; }
    seg += c;
  }
  segs.push(seg);
  for (const s of segs) {
    const t = s.trim();
    if (!t || t.startsWith('...')) continue;
    const m = t.match(/^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?::|$)/);
    if (!m) continue;
    const k = m[1] || m[2] || m[3];
    // 跳过 method 简写里明显是函数体的片段: `cb = cb || function () {}` 之类不在此处出现
    out.add(k);
  }
}

/** 从表达式里抽顶层标识符 */
function idents(expr, allow) {
  const clean = stripStrings(expr);
  const out = new Set();
  const re = /([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(clean))) {
    const name = m[1];
    const prev = clean[m.index - 1];
    const next = clean.slice(m.index + name.length).match(/^\s*(.)/);
    if (prev === '.') continue;                       // 属性访问 a.b 里的 b
    if (next && next[1] === ':') continue;            // 对象字面量键名
    if (KEYWORDS.has(name)) continue;
    if (allow.has(name)) continue;
    out.add(name);
  }
  return out;
}

const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'typeof', 'in', 'instanceof']);

// ---------- 页面检查 ----------

const appJson = JSON.parse(fs.readFileSync(path.join(WX, 'app.json'), 'utf8'));
const pages = appJson.pages || [];

check(pages.length > 0, `app.json 声明了 ${pages.length} 个页面`);

let pageFail = 0;
for (const p of pages) {
  const base = path.join(WX, p);
  const files = ['.js', '.wxml', '.wxss', '.json'].map((e) => base + e);
  const lack = files.filter((f) => !fs.existsSync(f));
  // json 允许缺省(仅用于覆盖窗口样式), 不算错
  const lackMust = lack.filter((f) => !f.endsWith('.json'));
  if (lackMust.length) {
    bad(`${p}: 缺少 ${lackMust.map((f) => path.basename(f)).join(', ')}`);
    pageFail++;
    continue;
  }

  const wxml = fs.readFileSync(base + '.wxml', 'utf8');
  const js = fs.readFileSync(base + '.js', 'utf8');

  // 1. 事件处理函数
  const declared = declaredKeys(js);
  const hset = handlers(wxml);
  const missingFn = hset.filter((fn) => !new RegExp(`\\b${fn}\\s*(\\(|:\\s*function)`).test(js));
  if (missingFn.length) {
    bad(`${p}: 事件函数未定义 → ${[...new Set(missingFn)].join(', ')}`);
    pageFail++;
  } else if (hset.length) {
    ok(`${p}: ${new Set(hset).size} 个事件函数全部存在`);
  }

  // 2. 模板变量
  const locals = loopVars(wxml);
  const allow = new Set([...locals, ...declared]);
  const missingVar = new Set();
  for (const e of exprs(wxml)) {
    for (const id of idents(e, allow)) missingVar.add(id);
  }
  if (missingVar.size) {
    bad(`${p}: 模板变量未声明 → ${[...missingVar].join(', ')}`);
    pageFail++;
  } else {
    ok(`${p}: 模板变量全部有来源`);
  }
}

// ---------- 样式类完整性 ----------
//
// wxml 里写了 class 但 wxss 里没定义, 是「真机不报错、但布局塌了」的典型来源。
// `page` 是白名单: wxml 里 <view class="page"> 只是包裹层, 视觉来自 app.wxss 的 page 元素选择器。

const WHITELIST_CLASS = new Set(['page']);

function definedClasses(css) {
  const set = new Set();
  const re = /\.([A-Za-z][\w-]*)/g;
  let m;
  while ((m = re.exec(mask(css)))) set.add(m[1]);
  return set;
}

const globalCss =
  fs.readFileSync(path.join(WX, 'app.wxss'), 'utf8') +
  fs.readFileSync(path.join(WX, 'pages/result/bird-art.wxss'), 'utf8');

for (const p of pages) {
  const pageCssPath = path.join(WX, p + '.wxss');
  if (!fs.existsSync(pageCssPath)) continue;
  const defined = definedClasses(globalCss + fs.readFileSync(pageCssPath, 'utf8'));
  const wxml = fs.readFileSync(path.join(WX, p + '.wxml'), 'utf8');
  const used = new Set();
  const re = /class\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(wxml))) {
    m[1].replace(/\{\{[\s\S]*?\}\}/g, ' ')      // 动态类交给渲染校验, 这里只看静态类
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => used.add(c));
  }
  const missing = [...used].filter((c) => !defined.has(c) && !WHITELIST_CLASS.has(c));
  if (missing.length) {
    bad(`${p}: class 未在 wxss 定义 → ${missing.join(', ')}`);
    pageFail++;
  } else {
    ok(`${p}: ${used.size} 个静态 class 均有样式`);
  }
}

// ---------- 样式 @import 可达性 ----------
// wcsc 命令行版解析 @import 时找不到相对路径(工具局限), 这里自己校验目标文件是否存在。

const wxssFiles = [];
(function collectWxss(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) collectWxss(p);
    else if (f.endsWith('.wxss')) wxssFiles.push(p);
  }
})(WX);

let importFail = 0;
for (const f of wxssFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /@import\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const target = path.resolve(path.dirname(f), m[1]);
    if (!fs.existsSync(target)) {
      bad(`${path.relative(WX, f)}: @import 目标不存在 → ${m[1]}`);
      importFail++;
    } else {
      ok(`${path.relative(WX, f)}: @import ${m[1]} 可达`);
    }
  }
}
if (!wxssFiles.some((f) => /@import/.test(fs.readFileSync(f, 'utf8')))) {
  ok('样式表无 @import, 跳过可达性检查');
}

// ---------- tabBar ----------
const tabs = (appJson.tabBar && appJson.tabBar.list) || [];
for (const t of tabs) {
  check(pages.includes(t.pagePath), `tabBar「${t.text}」指向已注册页面 ${t.pagePath}`);
}

// ---------- 云函数自检 ----------

const cfRoot = path.join(WX, 'cloudfunctions');
const fnDirs = fs.readdirSync(cfRoot).filter((d) => fs.statSync(path.join(cfRoot, d)).isDirectory());
for (const d of fnDirs) {
  const need = ['index.js', 'package.json'];
  const lack = need.filter((f) => !fs.existsSync(path.join(cfRoot, d, f)));
  check(!lack.length, `云函数 ${d}: 必备文件齐全${lack.length ? ' (缺 ' + lack.join(',') + ')' : ''}`);
}

// ---------- 结果 ----------

console.log(`\n${fail === 0 ? '全部通过' : '存在问题'} (${pass} 项通过, ${fail} 项失败)`);
process.exit(fail === 0 ? 0 : 1);
