# 归巢 · 微信小程序版

与 Web 版（`../index.html`）同数据源同算法：`scripts/build-wechat.mjs` 把 `src/scoring.js`（ESM）转成 CommonJS 放进 `utils/`，**改算法后需重跑构建**：

```bash
node scripts/build-data.mjs && node scripts/build-wechat.mjs && node test/wechat-smoke.mjs
```

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
