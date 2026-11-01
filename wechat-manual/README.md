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

走**微信虚拟支付**（米大师 `wx.requestVirtualPayment`）：不需要营业执照、不需要微信支付商户号，
**个人主体小程序也能开通**（2026-08 官方开放「虚拟支付:个人」，条件：类目含「工具」+ 认证备案 + 月限额 10 万元）。

完整开通教程见 **[../docs/personal-payment-guide.md](../docs/personal-payment-guide.md)**。

链路：

```
点支付 → wx.login 取 code
   → 云函数 virtualPaymentSign（签名 + 订单落库 pending）
   → wx.requestVirtualPayment 拉起收银台
   → success 后云函数 virtualPaymentQuery 查单确认（/xpay/query_order，status 2/4 才算已付）
   → 确认后解锁；平台延迟则先解锁并标 pending，下次进页面 syncPending 补齐
   → 平台发货推送 → 云函数 virtualPaymentNotify（验签 + wx_order_id 幂等 → delivered）
```

```
pages/index/index.js   入口（paying 防重复点击 + syncPending 补偿）
utils/pay.js           支付封装：基础库/iOS 版本门槛、下单、调起、查单确认、错误码翻译、本地流水
pay.config.js          前端配置：devMode / env / strictServerConfirm / 展示价格
cloudfunctions/virtualPaymentSign/    签名下单（paySig + signature 只能在服务端算）+ 订单落库
cloudfunctions/virtualPaymentQuery/   查单确认 + 定时兜底（5 分钟扫 pending 单）
cloudfunctions/virtualPaymentNotify/  发货推送接收（验签、幂等）
```

### 调试开关

`pay.config.js`：

- `devMode: true`（当前）：假支付，不触网、不调支付 API，直接解锁。用于本地联调 UI 与页面跳转。
- `devMode: false`：走真实链路，需先完成下面五项配置。
- `strictServerConfirm`：保持 `true`，解锁必须经服务端查单确认（官方要求前端回调不作为发货依据）。

**`devMode` 有环境护栏**（`utils/pay.js` 的 `devModeActive()`）：它会读 `wx.getAccountInfoSync().miniProgram.envVersion`，
一旦当前是**体验版（trial）或正式版（release）**，即使 `devMode` 还是 `true` 也强制走真实支付，
并在控制台打 `console.error`。避免「忘了关开关 → 所有用户点一下就白拿」这类事故。

重置解锁态：`wx.removeStorageSync('guichao_paid')`，或在开发工具「清缓存」。

### 切真实支付的前置条件

1. 小程序主体：个人 / 个体户 / 企业均可；个人主体另需类目含「工具」+ 认证备案（月限额 10 万）
2. 小程序后台「支付与交易 → 虚拟支付」开通 + 扫码签约
3. 「虚拟支付 → 基本配置」拿 `offerId`(OfferID) + 现网 `AppKey`
4. 「道具管理」建道具拿 `productId` 并**发布**（价格须与云函数 `goodsPrice` 一致，发布后几分钟~半小时生效）
5. 开通云开发：建集合 `xpay_orders`，依次部署三个云函数，填各自 `config.js`（`appSecret` 必填，查单要换 access_token）
6. iOS 收款：配小程序简称 + 开通苹果 IAP；用户微信需 8.0.68+

签名算法（云函数内已实现，改配置即可）：

```
paySig    = hex(hmac_sha256(appKey,     'requestVirtualPayment&' + signData))
signature = hex(hmac_sha256(sessionKey, signData))
```

`env=0` 用现网 AppKey，`env=1` 用沙箱 AppKey。**现网版本 env 只能填 0**（填 1 报 -15011）；沙箱仅开发版调试可用，模拟器拉不起收银台，必须真机。

常见报错：`-15002` 单号重复、`-15005` 用户态签名、`-15006` 支付签名、`-15007` 登录态过期、`-15013` 道具价格不一致、`-15014` 道具发布未生效、`-15017` 收款受限、`-15021` 交易限频（个人主体月限额 10 万）。

`cloudfunctions/createOrder` 与 `payCallback` 是**另一条链路**（微信支付 + 云开发 cloudPay），当前未接入，保留作备选方案。

## 测试

```bash
node test/wechat-bind.cjs    # 静态: 事件函数/模板变量/class 样式/app.json 页面与 tabBar/云函数文件
node test/wechat-render.cjs  # 渲染: 调官方 wcc 编译器, 6 个页面用真实数据渲染并断言关键节点
node test/pay-smoke.cjs      # 支付分支：devMode / 低版本 / iOS 门槛 / 取消 / 查单延迟 / 云函数完整性
node test/pay-server.cjs     # 服务端：signData 结构、签名固定向量、查单请求、推送解析与验签
node test/wechat-smoke.mjs   # 测评四路径 + 分享卡
node test/manual-smoke.cjs   # 手册 37 城完整性 + 对比矩阵 + bestOf 逻辑
node test/smoke.mjs          # Web 版测评链路
```

`wechat-render.cjs` 依赖微信开发者工具自带的 `wcc.exe`，默认从常见安装路径查找，
装在别处时用 `WCC_PATH=/path/to/wcc.exe node test/wechat-render.cjs` 指定；找不到会自动跳过。

## 接入 Web 分享卡二维码

Web 版 `src/result.js` 分享卡底部预留了右侧圆形码位（`assets/manual-qrcode.jpg`）。发布本小程序后在微信公众后台生成小程序码替换即可（scene 可带 `pinyin=xxx` 直达单城详情页 `pages/city/city?pinyin=xxx`）。

## 本地调试

微信开发者工具「导入项目」选本目录。appid 用测试号即可跑通除支付外的全部功能；支付在 `devMode: true` 下为假支付（无网络请求、无云函数依赖）。
