#!/usr/bin/env node
// 用无头 Chrome + CDP 打开 web 版结果页并截图 (不用装 puppeteer)
// 用法: node scripts/preview-result.mjs [输出png] [事业选项0-3=3] [生活选项0-3=3]
// 例:   node scripts/preview-result.mjs out.png 3 0   # 高事业 + 低生活 → 游隼
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'result-preview.png');
const A = Number(process.argv[3] ?? 3);   // 事业题统一选第几项
const L = Number(process.argv[4] ?? 3);   // 生活题统一选第几项
const PORT = 9333 + (Number(process.env.PORT_OFFSET) || 0);

const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));
if (!CHROME) {
  console.error('找不到 Chrome/Edge, 用 CHROME_PATH 环境变量指定');
  process.exit(1);
}

// 造一套答案: 指定维度的选项, 其余取中间值
const raw = JSON.parse(readFileSync(join(ROOT, 'data/questions.json'), 'utf8'));
const QUESTIONS = Array.isArray(raw) ? raw : (raw.questions || raw.QUESTIONS);
const answers = {};
for (const q of QUESTIONS) {
  let i = 1;
  if (q.id === 'F00') i = 5;          // 西南
  else if (q.id === 'F02') i = 1;
  else if (q.id === 'F03') i = 2;
  else if (q.dimension === 'ambition') i = A;
  else if (q.dimension === 'lifestyle') i = L;
  answers[q.id] = i;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  '--window-size=760,1400', '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 40 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch { /* 还没起来 */ }
  if (!ws) await sleep(250);
}
if (!ws) { console.error('浏览器没起来'); chrome.kill(); process.exit(1); }

await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: mid, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'file:///' + join(ROOT, 'index.html').replace(/\\/g, '/') });
await sleep(1500);

const data = await send('Runtime.evaluate', {
  awaitPromise: true, returnByValue: true,
  expression: `(async () => {
    const m = await import('./src/result.js');
    m.renderResult(${JSON.stringify(answers)}, document.getElementById('app') || document.body);
    return JSON.stringify({
      name: document.querySelector('.pc-name')?.textContent,
      en: document.querySelector('.pc-en')?.textContent,
      tag: document.querySelector('.pc-tagline')?.textContent,
      shapes: document.querySelectorAll('.pc-bird svg *').length,
    });
  })()`,
});
const info = JSON.parse((data.result && data.result.value) || '{}');
console.log(`画像=${info.name} | ${info.en} | ${info.tag} | 剪影${info.shapes}个图元`);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
console.log('截图 =', OUT);

ws.close();
chrome.kill();
process.exit(0);
