# 归巢 · 微信小程序版

与 Web 版（`../index.html`）同数据源同算法：`scripts/build-wechat.mjs` 把 `src/scoring.js`（ESM）转成 CommonJS 放进 `utils/`，**改算法后需重跑构建**：

```bash
node scripts/build-data.mjs && node scripts/build-wechat.mjs && node test/wechat-smoke.mjs
```

## 支付（虚拟支付 ¥2 解锁测评）

走 **微信虚拟支付**（`wx.requestVirtualPayment`）—— 适合个人/个体户主体的轻量方案：

| 项 | 详情 |
|---|---|
| 货币 | 微信豆（1 元 = 10 豆）|
| 主体 | **非个人**（个体户/企业即可，比 wx.requestPayment 易办）|
| 接入 | 无需商户号/证书/云函数，前端签名即可 |
| 抽成 | 微信 1% + iOS 30%（**Android 实收 ≈ ¥1.8，iOS 实收 ≈ ¥1.32**）|
| 单日上限 | 1 万元，单月 10 万元 |

### 启用 4 步

1. 非个人主体小程序（个体户/企业）
2. 后台「功能 → 虚拟支付」申请开通 + 选类目（建议：教育/工具）
3. `pay.config.js` 改两处：
   - `devMode: false`
   - `offerId: '<后台生成的道具/服务 ID>'`
4. 微信开发者工具预览（基础库 ≥ 2.19.0）

### 测试

- 当前 `devMode: true`：测试号无虚拟支付权限，跳过真实支付直接解锁（仅本地调试）
- `node test/wechat-smoke.mjs` 覆盖 devMode / 真实支付成功 / 取消 / 缺 offerId 四条路径

### 收益预期（粗算）

- ¥2 抽成后：Android 拿 1.8，iOS 拿 1.32
- 若平台 iOS 用户占比 50%，单次实收 ≈ ¥1.56
- **建议起步 ¥3**：iOS 抽完到手 ≈ ¥2，与「¥2 解锁」心智一致

### 未支付防线

- 首页 → 支付 → 成功 → 进答题
- 直接进 quiz/result 页 → 检测未支付 → 弹回首页

## 目录

```
wechat/
├── app.js/json/wxss        # 全局: 答案存 localStorage(wx storage)
├── pay.config.js           # 支付配置 (价格/devMode/offerId)
├── project.config.json     # 导入微信开发者工具用
├── sitemap.json
├── utils/
│   ├── pay.js              # 虚拟支付封装
│   ├── scoring.js          # ← src/scoring.js 转换 (勿手改)
│   ├── questions.js
│   └── cities.js
└── pages/
    ├── index/              # 欢迎页 (¥2 解锁卡片/开始/继续/重开)
    ├── quiz/               # 答题页 (进度条/回退/断点续答)
    └── result/             # 结果页 (画像卡/五维/Top3/分享)
```

## 使用

1. 微信开发者工具 → 导入项目 → 选 `wechat/` 目录
2. AppID 用测试号（仅 devMode）或正式主体 AppID（启用虚拟支付）
3. 预览/真机调试即可

## 与 Web 版差异

| | Web | 小程序 |
|---|---|---|
| 分享 | canvas 卡片 png 下载 | 原生转发 (open-type=share) + 复制文案 |
| 断点续答 | localStorage | wx.setStorageSync |
| 部署 | GitHub Pages | 需注册小程序 + 审核 |
| 付费 | 免费 | ¥2 虚拟支付 |

**分享卡片图片**（canvas 生成）小程序暂未实现——用「转发卡片 + 复制文案」替代，后续可加 canvas 2d 海报。
