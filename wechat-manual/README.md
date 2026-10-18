# 归巢小手册 · 微信小程序

与测评小程序（`../wechat`）和 Web 版（`../index.html`）同数据源。定位：**数据速查手册** —— 测评分享卡片底部二维码的落地页。

## 功能

- **城市名录**：37 城（34 省会/首府 + 直辖市 + 强二线），按城市层级筛选，点进详情
- **城市详情**：6 大维度（经济机会 / 买房难度 / 落户政策 / 五险一金 / 宜居条件 / 人才政策）全字段展示，含单位说明与来源（点来源复制链接）
- **城市对比**：最多同时 3 城，维度→字段矩阵，数值型字段自动高亮最优值（房价收入比/首付/落户难度等越低越优已内置）

## 数据链路

```bash
node scripts/build-data.mjs    # data/*.json -> src/*.js (Web版)
node scripts/build-wechat.mjs  # src/*.js   -> wechat/utils/ (测评小程序)
node scripts/build-manual.mjs  # data/cities/*.json -> wechat-manual/utils/cities.js (本手册)
```

**改数据后必须重跑 build-manual.mjs**，否则手册展示旧数据。`utils/cities.js` 为自动生成，勿手改。

## 接入测评分享卡（待做）

Web 版 `src/result.js` 的 `drawShareCard()` 目前底部文字是「扫码测测你该去哪座城市 →」，实际二维码位留空。上线手册小程序后：

1. 生成小程序码：`wxacode.getUnlimited`（scene 可带测评结果城市，落地直接打开该城详情页 `pages/city/city?pinyin=xxx`）
2. 分享卡 canvas 底部画入二维码图片
3. 本手册 `pages/city/city.js` 已支持 pinyin 参数直达

## 本地调试

微信开发者工具「导入项目」选本目录（appid 用测试号即可，无支付无云函数）。
