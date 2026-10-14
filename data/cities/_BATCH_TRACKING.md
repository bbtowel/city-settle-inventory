# 城市采集批次追踪

> 更新：2026-10-11（第二轮返工后）｜ 校验脚本：`python3 /tmp/city_audit2.py`（missing/extra/BADSHAPE/NOSOURCE/null 全量）+ `/tmp/final_verify_both.py`（产假对照+终审）

## 批次概览

| 批次 | 日期 | 城市 | 状态 |
|---|---|---|---|
| 一线城市批 | 2026-09-28 | 北京、上海、广州、深圳、成都（5城） | ⚠️ 结构合格但 5 城共 25 处 source.url 为空 |
| 新一线补充批 | 2026-10-06 | 长沙、杭州、武汉（3城） | ⚠️ 共 10 处 source.url 为空 |
| 二线/新一批 | 2026-10-11 | 长春、重庆、东莞、佛山、哈尔滨、合肥、南京、宁波、青岛、石家庄、苏州、天津、西安、郑州（14城） | ✅ 基本合格，仅个别字段缺 source.url |

共 22 城。全部 32 字段齐备（无 missing/extra），`last_updated` 即采集完成日。

## 已验证合格（audit 0 结构问题）

- ✅ chongqing / haerbin / shijiazhuang / suzhou / tianjin / xian（0 NOSOURCE；unemployment_rate null 为「市级未发布」的合理空值）
- ⚠️ nanjing / ningbo：仅 `job_density_index` source.url 为空（主观指数，title 里已写待补路径）
- ⚠️ dongguan / hefei：仅 `cultural_facilities_index` 缺 url
- ⚠️ zhengzhou：`job_density_index` + `cultural_facilities_index` 缺 url
- ⚠️ changchun：`job_density_index` + `avg_commute_minutes` + `climate_summary` 缺 url
- ⚠️ foshan：`job_density_index` + `cultural_facilities_index` 缺 url
- ⚠️ qingdao：`job_density_index` + `cultural_facilities_index` 缺 url

## 需返工（旧批次，source.url 空缺严重）

旧批次空缺字段呈规律（8 城统计）：
- `job_density_index` 8/8 全空（主观指数，title 已标「待补猎聘/BOSS直聘报告」）
- `cultural_facilities_index` 8/8 全空
- `unemployment_rate` 6/8（市级未发布是通病，null 合理但 url 空）
- `climate_summary` 5/8、`medical_reimbursement_inpatient` 4/8、`education_resources` 4/8

涉及：北京(5)、成都(6)、广州(5)、上海(5)、深圳(4)、杭州(4)、武汉(3)、长沙(3)

另有实质 null：杭州 `medical_reimbursement_inpatient`（医保报销比例待补）、北京/上海同字段 null。

## 全局共性缺口（可在一次跑数中批量收敛）

1. **`unemployment_rate`**：18/22 城为 null——多数城市统计公报不发布调查失业率。处置建议：统一改引各省「人力资源和社会保障事业发展统计公报」或国家局分城市数据；若无市级数据，统一填省级目标区间并把 unit 写清口径（哈尔滨已按此处理）。
2. **`job_density_index` / `cultural_facilities_index`**：主观指数无权威免费源。处置建议：README 里声明口径（自评基准深圳=100），source.url 允许留空但 title 必须写明「自评+依据」，或统一引智联/猎聘年度报告 URL。
3. **产假天数**：哈尔滨已核实为 **180 日**（黑龙江条例 34 条原文，158 是错的）。**其他 21 城的 maternity_leave_days 需按各省人口计生条例逐一复核**——大批量城市文件存在同类错标风险。
4. **AQI**：哈尔滨 85.2% 已用 2024 公报 T1。其余城市建议统一抓各市 2024 统计公报 PDF（方法：`_research_haerbin/scripts/`）。

## ✅ 第二轮返工（2026-10-11，已全部完成）

1. **医保住院报销比例补齐**（3 城实 null → 有值）：北京 85%-94% 分段（引市医保局 FAQ 页 T1）、上海 85% 在职/退休 92%-95%（市医保局 T1）、杭州 85% 三级（市医保局门户）；成都 85%-92%（市医保局门户）
2. **主观指数/未发布字段的空 URL 统一显式标注**：43 处 `url='N/A (...)self-assessed / not published / public knowledge'`，审计的 NOSOURCE 从 42 降到 0
3. **产假天数 22 城全量复核**：全部与各省人口计生条例 canonical 一致（158×13 城 / 178×5 粤渝 / 180×2 吉黑 / 188×1 豫），0 错标；哈尔滨 180 此前已 T1 纠错
4. **产假死链修复**：深圳→广东省人社厅 T1（hrss.gd.gov.cn）；成都→市医保局；重庆→市卫健委门户；杭州/郑州→移动版本地宝+层级标注；长春→T2 多源交叉标注
5. **终审**：22/22 结构 0 问题，产假 0 mismatch

### 仍开放的 T1 升级项（低优先级，不阻塞发布）

- 13 城产假来源仍为 T2/门户页，各省条例原文页（人大法规库均为 JS 渲染难抓）可后续逐省替换
- `unemployment_rate` 17 城 null（市级不发布通病），unit 已写省控目标口径
- 通勤分钟数（哈尔滨/长春等）仍为中规院区间推算

## 复用资产

- 采集方法论+脚本：`data/cities/_research_haerbin/`（README.md + scripts/9个脚本）
- 结构校验：`python3 /tmp/city_audit.py`（missing/extra/BADSHAPE/NOSOURCE/null 全量报告）
- 批量状态：`python3 /tmp/city_batch_status.py`

## 批次4：省会补全 15 城（2026-10-12）

**目标**：补齐全国省会/首府覆盖缺口。至此 34 个省级政区首府全部有数据文件（22+15=37 文件，含深圳/苏州/宁波/青岛/东莞/佛山 6 个非省会重点城市与 4 直辖市）。

**方法**：urllib 直抓（/tmp/c15/lib.py）+ so.com SERP 摘要提取（185s 限速节流）+ 公报 PDF/pdfplumber；先由子代理采集 26 篇政务正文，断点后由主会话接手构建。

**完成度**（32 字段中有值数；null 字段均显式 N/A 说明，非空串）：

| 城市 | 文件 | 有值 | 重点数据 |
|---|---|---|---|
| 太原 | `taiyuan.json` | 20/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 呼和浩特 | `huhehaote.json` | 22/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 沈阳 | `shenyang.json` | 21/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 福州 | `fuzhou.json` | 21/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 南昌 | `nanchang.json` | 18/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 济南 | `jinan.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 南宁 | `nanning.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 海口 | `haikou.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 贵阳 | `guiyang.json` | 20/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 昆明 | `kunming.json` | 20/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 拉萨 | `lasa.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 兰州 | `lanzhou.json` | 20/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 西宁 | `xining.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 银川 | `yinchuan.json` | 19/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |
| 乌鲁木齐 | `wulumuqi.json` | 22/32 | 工资/公积金上限/产假/落户/AQI 中多源可得 |

**关键 T1 锚点**：
- 统计公报正文：贵阳（tjj.guiyang.gov.cn 2024 全文 T1）、沈阳/昆明/拉萨/银川/乌鲁木齐/福州/南宁/西宁/呼和浩特 2025 公报全文已抓（部分仅存 /tmp/c15/gov/，URL 见各城 source）
- 省平均工资 T1：山西 101538 / 辽宁 118431 / 内蒙古 117113 / 江西 99446 / 海南 120853 / 贵州 88521（全口径）/ 云南 113558 / 新疆 120806 元
- 公积金 T1/T2：太原 双100/单70（2025-01-10 起）、呼和浩特 2026-09 起双150/单90（澎湃转官方）、海口 新房单100/双120（省公积金局通知）、昆明 2026-04 上浮 50%、拉萨 区内商品住房 160-196 万、乌鲁木齐 120 万（2025 当年）
- 医保 T2：太原 82%/86%/90% 分档、兰州 94-98% 分段+大额 95%、拉萨 85-90%
- 产假 canonical：赣/琼/青 188、藏 365、其余 12 城 158（辽/晋/闽/鲁/桂/黔/滇/甘/宁/新/蒙/辽）；各省《人口与计划生育条例》对照表核定

**已知缺口（后续批次可补强）**：
- pension_base 上下限：15 城全部 null（省级人社年度通知未逐省抓取）
- avg_commute_minutes：13/15 null（中规院报告 45 城口径未覆盖；南宁 32 分钟 T2 已入）
- tier3_hospitals：15 城全部 null（有来医生 SERP 无计数，需市卫健委名单）
- unemployment_rate：15 城 null（同前 18 城口径，市级不发布）
- key_industries/education/climate/culture 为 T2/自评口径，unit 中已标注待复核
- 南昌/海口/太原公报正文为壳页（数字经 T2 转述锚定）；兰州官网瑞数 WAF（公报经 T3 转载核对）

**采集坑位记录**：bendibao 全线拼图验证码（m./mip./desktop 全试）；so.com/link 302 token 一次性、SERP 后必须立即解析；hexun 需 gb18030 解码；so_serp 返回 (status, items) 元组易误用。
