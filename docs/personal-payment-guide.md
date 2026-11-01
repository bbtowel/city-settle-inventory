# 个人小程序收款：微信「虚拟支付:个人」开通与接入指南

> 面向本项目（归巢 · 城市定居测评，¥2 解锁）写的，但流程对任何个人主体小程序通用。
> 官方原文：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/person
> 编辑器最后核对：2026-11-01（文档 2026-08-31 上线，2026-09-07 更新）

---

## 0. 一句话版本

**2026 年 8 月 31 日起，个人主体小程序也能直接收钱了**：不用营业执照、不用对公账户、不用微信支付商户号，
用身份证注册的小程序就能卖虚拟商品（解锁功能、付费内容、订阅、次数包）。
入口在小程序后台【支付与交易 → 虚拟支付】，开通审核通常 5 分钟，费率 Android 等端 1%、iOS 12%，
限制是**全终端月限额 10 万元**。

本项目已经按这条链路改好了代码（见第 4 节），你只需要开通后台 → 填 4 个参数 → 部署 3 个云函数。

---

## 1. 先搞清楚：为什么它「不需要商户」

微信里能收钱的路有三条，别混：

| 方案 | 需要什么资质 | 收款账号 | 适合谁 | 费率 | 到账 |
|---|---|---|---|---|---|
| **虚拟支付（个人主体）** | 身份证 + 小程序认证备案 + 类目含「工具」 | OfferID（微信内部叫虚拟支付商户号，但**申请时不看营业执照**） | 个人开发者、单人产品 | Android 等 1%，iOS 12%（Apple） | Android T+3，iOS 45–60 天 |
| 虚拟支付（企业/个体户） | 营业执照 + 认证备案 | OfferID | 公司、个体户 | 同上（部分类目更低） | 同上 |
| 微信支付（JSAPI/小程序支付） | 营业执照 + 对公账户 + 商户号申请 | 微信支付 MchId | 有实体的商家、卖实物 | 0.6% 左右 | T+1 |

关键区别：

- **虚拟支付只能卖虚拟商品**（解锁功能、内容、道具、订阅、打赏），不能卖实物、不能做代收代付。
- 开通后后台仍会给你一个 **OfferID**（也叫「虚拟支付商户号」），这只是微信侧记账用的账号，
  和银行商户号是两回事——**你不需要营业执照、不需要开户许可证**。
- iOS 端的钱是 Apple 收的，微信拿不到，所以佣金 12%、结算 45–60 天，且退款只能用户找 App Store。

> 一句话：**「非商户支付」= 微信虚拟支付 + 个人主体**。它在微信体系内是合规的虚拟商品收费通道，
> 只是它的「收款主体」不是银行商户，而是你的小程序本身。

---

## 2. 开通前自检（不满足就别往下走）

| 条件 | 具体要求 | 怎么查 |
|---|---|---|
| 主体 | 小程序主体为**个人**，开发者持中国大陆居民身份证 | 后台 → 设置 → 基本设置 → 主体信息 |
| 服务类目 | **必须含「工具」**（个人主体只对符合条件的类目开放） | 后台 → 设置 → 基本设置 → 服务类目 → 添加「工具」下的子类目 |
| 认证 | 已完成小程序**微信认证**（个人主体 ¥30/年） | 后台 → 设置 → 基本设置 → 微信认证 |
| 备案 | 已完成**小程序备案**（2023 年后新小程序必做） | 后台 → 设置 → 基本设置 → 小程序备案 |
| 商品类型 | 只卖虚拟商品；**不支持**需要电信业务资质的服务（邮件、语音信箱、存储转发、信息发布、信息搜索等） | 对照自己的功能 |
| 限额 | 全终端**月支付限额 10 万元**，超额当月无法继续收款 | 后台虚拟支付首页 |

费率与结算（个人主体）：

| 终端 | 费率 | 结算 | 退款 |
|---|---|---|---|
| Android 等 | 腾讯技术服务费 1% | T+3 | 180 天内退款退手续费，超过不退 |
| iOS | Apple 佣金 12% | 约 45–60 天 | 只能用户向 App Store 申请 |

> 定价提醒：本项目定价 ¥2。Android 到手约 ¥1.98；iOS 到手约 ¥1.76。
> 如果想让两端到手一致，可以把 iOS 端展示价做成 ¥2.3 左右（或干脆只做 Android + iOS 同步提价，看你的取舍）。

---

## 3. 手把手开通（约 10 分钟）

### Step 1 确认类目里有「工具」

后台 → 设置 → 基本设置 → 服务类目 → 添加类目。个人主体可选类目不多，
**「工具」是虚拟支付的硬门槛**，没有它开通入口会直接灰掉。

### Step 2 完成认证 + 备案

两步都在「设置 → 基本设置」里，认证要付 ¥30 并走法人/个人人脸核验；备案要填主体和服务内容，
审核 1–3 个工作日。**这两步没做完，虚拟支付开通页会提示「未满足开通条件」**。

### Step 3 进入虚拟支付并开通

1. 登录 https://mp.weixin.qq.com/
2. 左侧栏【支付与交易 → 虚拟支付】
3. 点【开通】→ 勾选同意协议
4. 填写个人资料：
   - 个人身份信息（姓名、身份证号，需与主体一致）
   - 提现账户（本人储蓄卡；以后台实际提供的选项为准）
   - 支付管理员（可以是本人，需手机号 + 微信扫码）
5. 提交后等待审核，**一般 5 分钟内出结果**
6. 刷新页面，审核通过后**扫码签约**（这一步不做完，下单会报 -15008 类错误）

### Step 4 记下三件套

| 信息 | 是什么 | 在哪找 |
|---|---|---|
| AppID | 小程序身份证号 | 后台 → 设置 → 基本设置 |
| **OfferID** | 你的支付账号 | 虚拟支付 → 基本配置 |
| **现网 AppKey** | 支付密钥（只在服务端用） | 虚拟支付 → 基本配置 |
| 沙箱 AppKey（可选） | 调试用，不产生真实扣款 | 虚拟支付 → 基本配置 |

> 沙箱限制：只有**开发版/体验版**能用；真机预览会被 `PAYMENT_ILLEGAL_IN_SANDBOX` 拦；现网版本 env 只能是 0，填 1 报 **-15011**。

### Step 5 建道具（这就是你的「商品」）

虚拟支付 → 道具管理 → 新建道具：

- 名称：`归巢城市定居测评解锁`
- 价格：**200（分）= ¥2**，必须与代码里 `goodsPrice: 200` 完全一致，否则 **-15013**
- 道具类型：一次性购买（short_series_goods 道具直购）
- 记下 **道具 ID（productId）**
- **点发布**，然后等几分钟到半小时全平台同步，期间下单会报 **-15014 / COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY**

### Step 6（要 iOS 收款才做）配小程序简称 + 开苹果 IAP

- 后台左下角头像 → 账号设置 → 基本信息 → **配置小程序简称**（Apple 支付要展示 display name）
- 回到 虚拟支付 → 基本配置 → **开通苹果 IAP 支付**
- 用户侧要求：iOS 15+、微信 8.0.68+、中国大陆 App Store 账号

---

## 4. 本项目怎么接（代码已就绪）

### 4.1 链路

```
用户点「¥2 解锁」
   │
   ├─ wx.login → code
   ├─ 云函数 virtualPaymentSign
   │     ├─ code → session_key（云调用 auth.code2Session，失败降级 appSecret）
   │     ├─ 拼 signData（offerId/buyQuantity/env/currencyType/productId/goodsPrice/outTradeNo/attach）
   │     ├─ paySig    = hmac_sha256(appKey,     'requestVirtualPayment&' + signData)
   │     ├─ signature = hmac_sha256(sessionKey, signData)
   │     └─ 订单落库 xpay_orders（status=pending）
   │
   ├─ wx.requestVirtualPayment（signData 原样字符串 + paySig + signature + mode）
   │
   ├─ success → 云函数 virtualPaymentQuery
   │     └─ POST /xpay/query_order（order.status 2/4 才算已支付）
   │         ├─ 确认已支付 → 本地解锁（confirmed）
   │         └─ 平台延迟/查单失败 → 先解锁 + 标 pending，下次进页面 syncPending 补齐
   │
   └─ 平台异步发货推送 → 云函数 virtualPaymentNotify（验签 + wx_order_id 幂等 → delivered）
```

设计原则对应官方三条硬要求：

1. **前端回调不作为发货依据** → 解锁必须经 `virtualPaymentQuery` 查单确认；
2. **以推送为主、查单兜底** → 推送丢失也有 5 分钟定时器扫 pending 单；
3. **金额只在服务端** → 前端只展示 `priceLabel`，`goodsPrice` 由云函数配置决定，改包改不了价。

### 4.2 文件清单

| 文件 | 作用 |
|---|---|
| `wechat-manual/pay.config.js` | 前端开关：`devMode` / `env` / `iosMinWx` / `strictServerConfirm` |
| `wechat-manual/utils/pay.js` | 下单、调起、查单确认、pending 补偿、错误码翻译、本地流水 |
| `wechat-manual/pages/index/index.js` | 入口 + `paying` 防重复 + `syncPending()` 补偿 |
| `cloudfunctions/virtualPaymentSign/` | 签名下单 + 订单落库；`config.json` 声明 `auth.code2Session` 云调用权限 |
| `cloudfunctions/virtualPaymentQuery/` | 查单 `/xpay/query_order` + 定时兜底（`config.json` 已配 5 分钟触发器） |
| `cloudfunctions/virtualPaymentNotify/` | 发货推送接收、明文模式验签、`wx_order_id` 幂等 |
| `cloudfunctions/*/lib.js` | 签名/解析纯函数，`node test/pay-server.cjs` 直接测 |
| `cloudfunctions/createOrder` `payCallback` | 旧的「微信支付 + cloudPay」备选链路，**未接入**，别误部署 |

### 4.3 要填的 4 处配置

**① 前端 `wechat-manual/pay.config.js`**

```js
devMode: false,          // 真机验证前必须从 true 改成 false
env: 0,                  // 现网；沙箱只在开发版临时改 1
strictServerConfirm: true, // 保持 true，别为了省事关掉
```

**② `cloudfunctions/virtualPaymentSign/config.js`**

```js
offerId: '你的 OfferID',
productId: '你的道具 ID',
goodsPrice: 200,        // 必须与后台道具价格一致（分）
appKeyProd: '现网 AppKey',
appSecret: '小程序密钥', // 开发管理 → 开发设置 → 小程序密钥
```

**③ `cloudfunctions/virtualPaymentQuery/config.js`** — 同样的 `offerId` / `appKeyProd` / `appSecret`
（云函数各自独立打包，没法跨目录 require，所以这两份要手动保持一致）

**④ `cloudfunctions/virtualPaymentNotify/config.js`**

```js
token: '你自定义的 Token',  // 与后台消息推送里填的一致；留空则不验签（仅开发期）
productId: '',             // 留空 = 不校验道具
```

### 4.4 云开发部署顺序

1. 开发者工具开通云开发，拿到环境 ID（填到 `pay.config.js` 的 `cloudEnv`，留空 = 默认环境）
2. 云开发控制台 → 数据库 → 新建集合 **`xpay_orders`**（权限选「仅创建者可读写」，云函数不受限）
   - 可选：新建 `xpay_meta` 存 access_token 缓存（不建也能跑，退回内存缓存）
3. 依次右键上传并部署（云端安装依赖）：
   - `virtualPaymentSign`
   - `virtualPaymentQuery`
   - `virtualPaymentNotify`
4. `virtualPaymentQuery` 的定时触发器随 `config.json` 一起部署，部署后在云函数详情里确认「触发器」有 `sweepPendingOrders`
5. 若用 HTTP 方案接推送，给 `virtualPaymentNotify` 开「HTTP 访问服务」，复制 URL

### 4.5 发货推送怎么接（二选一）

**方案 A：云开发消息推送（推荐，最省事）**

小程序后台 → 开发管理 → 开发设置 → 消息推送 → 启用，服务器配置里选**云开发**并指定云函数 `virtualPaymentNotify`。
平台会把 XML 解析成 JSON 传进来（`Event` / `OpenId` / `OutTradeNo` / `WeChatPayInfo.MchOrderNo` …），验签由平台完成。

**方案 B：自建 HTTP**

`virtualPaymentNotify` 开 HTTP 访问服务 → 把 URL 填到消息推送 → 消息加密方式选**明文模式或兼容模式**，
Token 填到 `config.js`（本项目实现了明文模式的 `sha1(sort(token,timestamp,nonce))` 验签，**没有实现 AES 解密**，
所以别选「安全模式」）。

> 两种方案都必须返回 `<xml><ErrCode>0</ErrCode></xml>`，否则平台按 15 次重试，最后这单就算「没发货」。

### 4.6 切真实支付的 4 步

```bash
# 1. 把 appid 换成真实小程序 appid（现在是 touristappid，支付必然失败）
#    wechat-manual/project.config.json → appid

# 2. 填完 4.3 的四处配置

# 3. pay.config.js 里 devMode 改 false

# 4. 真机验证（见第 5 节），别用模拟器
```

---

## 5. 端到端验证 SOP

模拟器拉不起米大师收银台，**必须真机**（预览 / 体验版）。

| 步骤 | 期望 |
|---|---|
| 1. 预览扫码，进首页 | 显示「¥2 解锁」 |
| 2. 点解锁 | loading「正在下单…」→ 弹出收银台 |
| 3. 支付 ¥2 | 回到小程序，页面自动进答题页 |
| 4. 云开发 → 数据库 → `xpay_orders` | 看到该单 `status: paid`（若推送已到则 `delivered`），`wxOrderId` 有值 |
| 5. 虚拟支付 → 交易订单 | 能看到这笔单，金额 ¥2 |
| 6. 重新进首页 | 直接可答题（`guichao_paid` 已写） |
| 7. 定时器 | 5 分钟后 pending 单被扫一遍（日志里 `scanned/paid`） |

自测命令（不需要真机，纯逻辑）：

```bash
node test/pay-smoke.cjs    # 前端分支：devMode / 低版本 / iOS 门槛 / 取消 / 查单延迟 / 云函数完整性
node test/pay-server.cjs   # 服务端：signData 结构、签名向量、查单、推送解析与验签
node test/wechat-smoke.mjs # 页面链路：支付 → 答题 → 结果
```

清掉解锁态：开发工具「清缓存」，或控制台执行 `wx.removeStorageSync('guichao_paid')`。

---

## 6. 上线前检查清单

官方 13 条 + 本项目 3 条，逐条打勾再提审：

- [ ] 开放条件确认：个人主体 + 大陆身份证 + 类目含「工具」+ 已认证备案
- [ ] 已知晓并接受：全终端**月限额 10 万元**
- [ ] 后台虚拟支付已开通并**完成签约**
- [ ] 拿到 AppID / OfferID / 现网 AppKey
- [ ] iOS 收款：已配小程序简称、已开通苹果 IAP
- [ ] 消息推送接收已部署（方案 A 或 B）
- [ ] 后台已配置发货推送 URL，并完成一笔测试支付验证
- [ ] 服务端验签逻辑与官方算法一致（`node test/pay-server.cjs` 的签名向量通过）
- [ ] 发货推送做了幂等（以 `wx_order_id` 去重）
- [ ] 前端 `wx.requestVirtualPayment` 打通，支付成功后收到推送
- [ ] 兜底查单就绪（`virtualPaymentQuery` + 定时触发器）
- [ ] 已向用户说明退款规则、结算周期、费率
- [ ] 上线后小额真单验证：支付 → 推送 → 发货 → 后台账单金额一致
- [ ] 本项目：`pay.config.js` 的 `devMode` 已是 `false`
- [ ] 本项目：`project.config.json` 的 appid 已换成真实 appid
- [ ] 本项目：三处 `config.js` 的 offerId / appKey / appSecret 一致且非空

---

## 7. 错误码速查（本项目已内置中文文案）

| 码 | 含义 | 先查什么 |
|---|---|---|
| -2 | 用户取消 | 正常路径，不用管 |
| -1 | 支付失败 | 真机 + 现网 env；看云函数日志 |
| -4 | 风控拦截 | 换账号/设备重试，或看后台违规通知 |
| -5 | 开通签约结果未知 | 后台是否已扫码签约 |
| -15002 | 单号重复 | `outTradeNo` 必须每次新生成（本项目 22 位时间戳+随机） |
| -15005 | 用户态签名错 | `signature` 的 sessionKey 是否过期（code 只能用一次） |
| -15006 | 支付签名错 | AppKey 用错（现网/沙箱混了）、signData 被二次序列化 |
| -15007 | 登录态过期 | 重新 `wx.login` 取 code |
| -15008 | 进件/签约未完成 | 后台虚拟支付是否真的开通并签约成功 |
| -15010 | 道具未发布 | 道具管理里点「发布」 |
| -15011 | 现网用了沙箱 | `env` 改回 0 |
| -15013 | 价格与后台不一致 | 道具价格 vs `goodsPrice`（单位：分） |
| -15014 | 道具发布未生效 | 等 10 分钟~半小时 |
| -15016 | signData 格式错 | 别往 signData 里塞 `mode` 等多余字段，传字符串不传对象 |
| -15017 / -15019 | 收款受限 / 账号受限 | 后台违规通知，常见于类目不符 |
| -15021 | 交易限频 | 个人主体月限额 10 万，或短时高频 |

---

## 8. 钱的部分

- **结算**：Android 等端 T+3；iOS 约 45–60 天（Apple 结算）。
- **提现**：虚拟支付首页看余额、每日账单，发起提现到开通时填的提现账户。
- **发票**：次月 5 号后可申请上月「腾讯技术服务费」发票（iOS 那 12% 找 Apple）。
- **退款**：Android 在后台【虚拟支付 → 交易订单】点退款，或服务端调 `/xpay/refund_order`；
  iOS 只能用户向 App Store 申请，你无法主动退。180 天内退款平台退手续费，超过不退。
- **限额**：个人主体全终端月支付 10 万元。这就是「验证阶段够用、放量要转企业主体」的分界线。

---

## 9. FAQ

**Q：个人主体能不能升级成企业主体，之后继续用同一个 OfferID？**
不能直接沿用。主体变更后需重新走企业版虚拟支付开通，OfferID/AppKey 会变，代码里换参数即可，订单数据留在老账号里。
所以验证期过了、月流水接近 10 万时，尽早规划主体变更。

**Q：只想先跑通界面，不做后台开通行不行？**
行。`pay.config.js` 的 `devMode: true` 就是假支付：不发请求、不调支付 API，直接写解锁态。
但它只能验证 UI 和页面跳转，不能验证真实扣款。

**Q：能不能绕过虚拟支付，直接用收款码收款？**
不能。小程序内引导用户扫个人收款码属于违规（会被判定绕开平台支付能力），轻则功能封禁重则下架。
虚拟支付就是给个人主体准备的合规通道。

**Q：iOS 上要不要干脆隐藏支付？**
可以，但不能「iOS 显示更贵/更便宜」这种差异化定价被审核抓（Apple 规则）。要么两端同价，要么 iOS 干脆只做展示不做支付。

**Q：查单接口报「不支持云调用」怎么办？**
`/xpay/query_order` 确实不支持云调用，必须用 `appid + appSecret` 换 access_token。
本项目 `virtualPaymentQuery` 已经实现了换 token + 缓存，只要 `config.js` 填了 `appSecret` 就能跑。

**Q：发货推送丢了怎么办？**
三保险：① 推送（主）② 前端支付成功后立即查单（次）③ 定时器每 5 分钟扫 pending 单（兜底）。
三者都以 `wx_order_id` / `outTradeNo` 幂等，重复到达不会重复发货。

---

## 10. 参考

- 虚拟支付:个人（开通与接入全流程）— https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/person
- wx.requestVirtualPayment（参数与错误码）— https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
- 查询订单 query_order — https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order.html
- 云开发接入虚拟支付（含 Agent 自动接入）— https://developers.weixin.qq.com/minigame/dev/wxcloud/guide/wechatpay/ai-virtualpayl-person.html
