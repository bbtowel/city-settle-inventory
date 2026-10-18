# 归巢 · 城市定居测评 + 小手册 · 微信小程序

**wechat-manual/** 是合并后的统一小程序（原 `wechat/` 测评端已并入，目录已删）。

## 页面结构（6 页）

| 页面 | 路径 | 来源 | 功能 |
|---|---|---|---|
| 测评首页 | `pages/index/index` | 原 wechat | ¥2 解锁入口（虚拟支付） |
| 答题 | `pages/quiz/quiz` | 原 wechat | 33 题五维测评 |
| 结果 | `pages/result/result` | 原 wechat | 画像 + Top3 + 分享卡 |
| 城市名录 | `pages/manual-home/index` | 原 manual | 37 城按层级筛选入口 |
| 城市详情 | `pages/city/city` | 原 manual | 6 维度 × 28 字段全量速查 |
| 对比 | `pages/compare/compare` | 原 manual | 最多 3 城并排，数值最优高亮 |

tabBar 三入口：**测评 / 城市名录 / 对比**。

## 数据链路

```bash
node scripts/build-data.mjs     # data/*.json -> src/*.js (Web版)
node scripts/build-wechat.mjs   # src/*.js   -> wechat-manual/utils/{scoring,questions,cities}.js
node scripts/build-manual.mjs   # data/cities/*.json -> wechat-manual/utils/manual-cities.js
```

**改数据后三个 build 一起跑**。`utils/*.js` 全为自动生成，勿手改。

## utils 两套数据文件并存的原因

- `cities.js`（扁平，~15 字段/城）：scoring 引擎消费，给 quiz/result 页算分
- `manual-cities.js`（嵌套 6 维度，~28 字段/城，173KB）：manual-home/city/compare 页全字段展示

## 支付

`pay.config.js`：`devMode: true` 调试态（无真实支付）。生产切 `devMode: false` + 填 `offerId`（微信虚拟支付后台）。

## 测试

```bash
node test/wechat-smoke.mjs   # 测评四路径 + 分享卡（1 条旧断言待更新：成都 Top1 现为重庆）
node test/manual-smoke.cjs   # 手册 37 城完整性 + 对比矩阵 + bestOf 逻辑
node test/smoke.mjs          # Web 版测评链路
```

## 接入 Web 分享卡二维码

Web 版 `src/result.js` 分享卡底部预留了右侧圆形码位（`assets/manual-qrcode.jpg`）。发布本小程序后在微信公众后台生成小程序码替换即可（scene 可带 `pinyin=xxx` 直达单城详情页 `pages/city/city?pinyin=xxx`）。

## 本地调试

微信开发者工具「导入项目」选本目录（appid 用测试号即可，无支付无云函数）。
