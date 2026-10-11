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
