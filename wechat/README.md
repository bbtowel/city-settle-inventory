# 归巢 · 微信小程序版

与 Web 版（`../index.html`）同数据源同算法：`scripts/build-wechat.mjs` 把 `src/scoring.js`（ESM）转成 CommonJS 放进 `utils/`，**改算法后需重跑构建**：

```bash
node scripts/build-data.mjs && node scripts/build-wechat.mjs && node test/wechat-smoke.mjs
```

## 支付（¥2 解锁测评）

- 开始测评前需支付 ¥2（`pay.config.js` 的 `priceFen: 200`），支付后本地标记永久解锁
- **当前 `devMode: true`**：跳过真实支付直接解锁，供开发调试
- **启用真实支付**（需企业/个体户主体）：
  1. 正式 AppID（个人/测试号无法开通微信支付）
  2. 开通云开发环境，`pay.config.js` 填 `envId` + `mchId`（微信支付商户号，与 AppID 绑定）
  3. `pay.config.js` 置 `devMode: false`
  4. 云函数目录 `cloudfunctions/`：`createOrder`（云调用统一下单）+ `payCallback`（回写 orders 集合）——开发者工具里右键「上传并部署(云端安装依赖)」
  5. 云开发数据库建 `orders` 集合
- 未支付直接访问 quiz/result 页会被弹回首页（双防线）

## 目录

```
wechat/
├── app.js/json/wxss        # 全局: 答案存 localStorage(wx storage)
├── project.config.json     # 导入微信开发者工具用
├── sitemap.json
├── utils/                  # 自动生成, 勿手改
│   ├── scoring.js          # ← src/scoring.js 转换
│   ├── questions.js
│   └── cities.js
└── pages/
    ├── index/              # 欢迎页 (开始/继续/重开)
    ├── quiz/               # 答题页 (进度条/回退/断点续答)
    └── result/             # 结果页 (画像卡/五维/Top3/分享)
```

## 使用

1. 微信开发者工具 → 导入项目 → 选 `wechat/` 目录
2. AppID 用测试号（或自己的 AppID）
3. 预览/真机调试即可

## 与 Web 版差异

| | Web | 小程序 |
|---|---|---|
| 分享 | canvas 卡片 png 下载 | 原生转发 (open-type=share) + 复制文案 |
| 断点续答 | localStorage | wx.setStorageSync |
| 部署 | GitHub Pages | 需注册小程序 + 审核 |

**分享卡片图片**（canvas 生成）小程序暂未实现——用「转发卡片 + 复制文案」替代，后续可加 canvas 2d 海报。
