// 九型鸟剪影 — 纯几何拼装, 单色填充 (currentColor), viewBox 120×120
// 只在这个文件里定义图形; web 直接内联 <svg>, 小程序由 scripts/build-wechat.mjs
// 转成 base64 背景图 (wechat-manual/pages/result/bird-art.wxss)
// 姿态本身就是画像语义: 俯冲=只要机会, 悬停=两头都要, 迁徙=哪好去哪,
// 栖枝=求稳, 水面=讲体面, 涉水站立=挑环境

const P = (n) => Math.round(n * 10) / 10;

// 椭圆 (可旋转)
const ell = (cx, cy, rx, ry, rot = 0) =>
  `<ellipse cx="${P(cx)}" cy="${P(cy)}" rx="${P(rx)}" ry="${P(ry)}"${rot ? ` transform="rotate(${P(rot)} ${P(cx)} ${P(cy)})"` : ''}/>`;
const circ = (cx, cy, r) => `<circle cx="${P(cx)}" cy="${P(cy)}" r="${P(r)}"/>`;
const poly = (pts) => `<path d="M${pts.map((p) => `${P(p[0])},${P(p[1])}`).join(' L')} Z"/>`;

// 展开的翅膀: 从肩点 cx,cy 伸向 dir 方向的翼尖, span=翼展半宽, lift=翼尖抬高, sweep=后掠量
function wing(cx, cy, dir, span, lift, sweep) {
  const tx = cx + dir * span;
  const ty = cy - lift;
  return `<path d="M${P(cx)},${P(cy - 3)}` +
    ` C${P(cx + dir * span * 0.32)},${P(cy - lift * 0.75)} ${P(cx + dir * span * 0.66)},${P(ty + 4)} ${P(tx)},${P(ty)}` +
    ` C${P(cx + dir * span * 0.62)},${P(ty + sweep)} ${P(cx + dir * span * 0.26)},${P(cy + 9)} ${P(cx + dir * span * 0.1)},${P(cy + 11)}` +
    ' Z"/>';
}

// 尾羽: kind = fork 燕尾 / fan 扇形 / long 长尾 / wedge 楔形
function tail(cx, cy, kind, scale = 1) {
  const s = scale;
  if (kind === 'fork') return poly([[cx - 7 * s, cy - 2], [cx - 15 * s, cy + 20 * s], [cx, cy + 9 * s], [cx + 15 * s, cy + 20 * s], [cx + 7 * s, cy - 2]]);
  if (kind === 'fan') return poly([[cx - 9 * s, cy - 2], [cx - 13 * s, cy + 14 * s], [cx, cy + 17 * s], [cx + 13 * s, cy + 14 * s], [cx + 9 * s, cy - 2]]);
  if (kind === 'long') return poly([[cx - 6 * s, cy - 2], [cx - 9 * s, cy + 26 * s], [cx, cy + 30 * s], [cx + 9 * s, cy + 26 * s], [cx + 6 * s, cy - 2]]);
  return poly([[cx - 8 * s, cy - 2], [cx - 5 * s, cy + 16 * s], [cx, cy + 18 * s], [cx + 5 * s, cy + 16 * s], [cx + 8 * s, cy - 2]]);
}

const beak = (x, y, dir, len = 8, w = 3) =>
  poly([[x, y - w], [x + dir * len, y], [x, y + w]]);

const group = (...parts) => `<g>${parts.join('')}</g>`;

export const BIRD_ART = {
  // 2,0 游隼 — 俯冲: 头朝下, 双翼抬高后掠, 收成一支箭
  '2,0': group(
    wing(60, 56, 1, 44, 34, 24),
    wing(60, 56, -1, 44, 34, 24),
    ell(60, 62, 9.5, 24, 0),
    poly([[52, 44], [60, 28], [68, 44]]),      // 上翘的尾
    circ(60, 90, 8.5),
    poly([[56, 96], [60, 108], [64, 96]]),     // 朝下的喙
  ),
  // 2,1 蜂鸟 — 悬停: 薄刃形上举翼, 身体紧凑, 一根长针喙
  '2,1': group(
    `<path d="M57,54 C47,36 33,26 23,25 C31,40 44,58 56,66 Z"/>`,
    `<path d="M63,54 C73,36 87,26 97,25 C89,40 76,58 64,66 Z"/>`,
    ell(60, 68, 10.5, 15),
    tail(60, 82, 'fan', 0.62),
    circ(61, 52, 7),
    poly([[55, 50], [26, 45], [54, 54]]),      // 长针喙
  ),
  // 2,2 鸿雁 — 迁徙: 大展弦比平直翼, 长颈前伸
  '2,2': group(
    wing(58, 62, -1, 50, 12, 20),
    wing(62, 62, 1, 50, 12, 20),
    ell(60, 66, 21, 11, -14),
    tail(46, 76, 'fan', 0.7),
    ell(84, 54, 12, 5, -18),
    circ(95, 50, 6),
    beak(101, 50, 1, 10, 2.8),
  ),
  // 1,0 麻雀 — 栖枝, 圆胖身体, 短翅短喙
  '1,0': group(
    ell(58, 66, 19, 16, -12),
    tail(42, 74, 'wedge', 0.85),
    circ(74, 50, 11),
    beak(85, 50, 1, 8, 4),
    ell(62, 62, 15, 9, -55),           // 收拢的翅
    `<rect x="52" y="86" width="30" height="4.5" rx="2.2"/>`,   // 树枝
    `<path d="M62,80 L60,86 L64,86 Z"/>`,
  ),
  // 1,1 喜鹊 — 栖枝, 直立长尾, 抬头的城中常客
  '1,1': group(
    ell(58, 62, 17, 14, -30),
    tail(46, 72, 'long', 0.95),
    circ(72, 40, 10),
    beak(82, 40, 1, 11, 3.4),
    ell(62, 60, 14, 8, -68),
    `<rect x="50" y="86" width="32" height="4.5" rx="2.2"/>`,
    `<path d="M64,76 L62,86 L66,86 Z"/>`,
  ),
  // 1,2 燕子 — 燕尾 + 新月形后掠翼
  '1,2': group(
    `<path d="M57,48 C42,40 24,42 12,54 C26,60 44,64 56,66 Z"/>`,
    `<path d="M63,48 C78,40 96,42 108,54 C94,60 76,64 64,66 Z"/>`,
    ell(60, 56, 7.5, 14),
    poly([[54, 64], [42, 100], [60, 84], [78, 100], [66, 64]]),
    circ(60, 42, 7.5),
  ),
  // 0,0 斑鸠 — 落地低头, 身体近水平, 尾巴长而拖地
  '0,0': group(
    ell(56, 66, 21, 13, -6),
    poly([[36, 66], [16, 78], [20, 84], [40, 74]]),
    circ(78, 58, 9),
    beak(87, 60, 1, 9, 3),
    ell(58, 62, 17, 7.5, -22),
    `<rect x="48" y="86" width="34" height="4.5" rx="2.2"/>`,
    `<path d="M70,79 L68,86 L72,86 Z"/>`,
  ),
  // 0,1 鸳鸯 — 水面, 翘尾, 回头的头
  '0,1': group(
    `<path d="M46,74 C46,58 62,50 78,52 C92,54 96,62 92,70 C86,80 58,82 46,74 Z"/>`,  // 船形身体
    poly([[44, 72], [26, 58], [40, 74]]),                                              // 翘起的尾
    circ(84, 46, 10),                                                                  // 头 (回望)
    beak(92, 50, 1, 10, 3.2),
    `<rect x="30" y="82" width="62" height="4.5" rx="2.2"/>`,                          // 水线
  ),
  // 0,2 白鹭 — 涉水站立: 细长 S 颈, 单腿收起, 择水而居
  '0,2': group(
    ell(57, 64, 18, 12, -10),
    poly([[41, 68], [21, 60], [27, 74]]),
    `<path d="M69,58 C75,46 65,38 68,29 C70,22 76,20 80,24" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    circ(81, 23, 8),
    poly([[87, 20], [101, 18], [88, 26]]),                     // 长喙前指
    `<path d="M55,74 L51,94" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>`,
    `<path d="M64,74 L66,87" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>`,
    `<path d="M45,89 L61,89" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>`,  // 收起的一条腿
    `<rect x="42" y="94" width="32" height="4" rx="2"/>`,
  ),
};

export const BIRD_VIEWBOX = '0 0 120 120';

// web: 内联 svg (颜色交给 CSS 的 color)
export function birdSvg(key, size = 96) {
  const art = BIRD_ART[key] || BIRD_ART['1,1'];
  return `<svg class="bird-svg" viewBox="${BIRD_VIEWBOX}" width="${size}" height="${size}" aria-hidden="true" fill="currentColor">${art}</svg>`;
}
