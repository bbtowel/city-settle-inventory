# assets

- `logo/` — 小程序头像（鸟巢剪影，深蓝底 + 琥珀色）。`nest-1024.png` 是上传主图，规格与上传步骤见 `logo/README.md`。
- `manual-qrcode.jpg` — 「归巢小手册」微信小程序码（200×200+，白底）。在微信公众后台 → 小程序管理 → 生成小程序码 / `wxacode.getUnlimited`，scene 可留空（落 index）或 `pinyin=xxx`（落单城详情）。
  - 未替换真实码时，`src/result.js` 分享卡的 `qr.onerror` 兜底，会只画底部引导文字、不画二维码圆，不影响分享卡出图。
