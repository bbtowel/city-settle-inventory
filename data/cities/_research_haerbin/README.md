# 哈尔滨（haerbin）采集记录

- 采集日期：2026-10-11
- 输出：`data/cities/haerbin.json`（32 字段/6 维度，31 有值 + 1 null）
- 数据分级：T1=政府官网原文（harbin.gov.cn / hrbgjj.org.cn / tjj.hlj.gov.cn / wsjkw.hlj.gov.cn），T2=媒体/聚合站转发

## 一、最终报告（字段完整度 + 样本 URL）

32/32 字段齐备，31 有值，1 null（`economy_opportunity.unemployment_rate`——哈尔滨市从未发布城镇调查失业率，已附参保数据+省控目标，标注待市人社局公报）。

| 维度 | 字段 | 状态 |
|---|---|---|
| economy_opportunity | 4 | 3/4（失业率 null） |
| housing_difficulty | 6 | 6/6 |
| hukou_policy | 4 | 4/4 |
| social_insurance | 8 | 8/8 |
| livability | 6 | 6/6 |
| talent_policy | 4 | 4/4 |

核心 T1 来源：
- 2024 统计公报官方 PDF：`https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024年哈尔滨市国民经济和社会发展统计公报.pdf`
- 公积金中心文件库：`https://www.hrbgjj.org.cn/zxwj/{id}.jhtml`（2222/2271/2273/2252/2331/2338/2440/2388/2379/1924/1962/sjwj/1809）
- 产假条例：`http://wsjkw.hlj.gov.cn/wsjkw/c109072/202111/c00_30479960.shtml`
- 省平均工资：`https://tjj.hlj.gov.cn/tjj/c106736/202506/c00_31850581.shtml`
- 购房优惠汇总：`https://www.harbin.gov.cn/haerbin/c104845/202501/c01_1035311.shtml`
- 人才新政30条：`https://www.harbin.gov.cn/haerbin/c104535/202312/c01_954986.shtml`

## 二、已核实的关键数字（T1）

- GDP 6016.3 亿元（+4.3%），三次产业 9.0:23.7:67.3（2024 公报）
- 户籍人口 933.0 万，城镇 525.9 万，60 岁以上占 29.5%（2024 公报）
- 城镇人均可支配收入 48216 元（+5.3%），农村 25157 元（2024 公报）
- AQI 优良 312/365 天 = 85.2%，PM2.5 年均 40μg/m³（2024 公报）
- 医院 360 家、床位 8.37 万张、卫技人员 9.00 万（2024 公报）
- 黑龙江省 2024 城镇非私营年均工资 99007 元（省统计局）
- 公积金：基准单 80/双 100 万（2222 细则）→ 多子女×1.3=104/130（2273）→ 高层次 40 倍余额 80/100（2252）→ 毕业生本科×1.2/硕士×1.3/博士×1.5（2338，哈公积金发〔2025〕25号，至 2030-09-01）→ 以旧换新+20%（哈公积金发〔2025〕20号）→ 余额核定 20→25 倍、缴存 6 个月+建户 180 天可贷（2271，2024-11-13 施行）
- 缴存基数 2026 上限 28430 元/月缴存额 6824 元（2440）；下限三档 2270/2010/1910（2388）；比例 5%-12%，灵活就业 10%-24%
- **产假 180 日**（《黑龙江省人口与计划生育条例》2021 年第 6 次修正第三十四条原文「女职工享受产假一百八十日」；注意不是 158——158 是江苏/北京口径）；男护理假 15 日、婚假 15 日+婚检 10 日、3 岁以下育儿假每年各 10 日；条例第四十九条：除产假外均指工作日
- 房价：新房 9332 元/㎡（房天下 2025-10 第 1 周，T2），南岗 14287、二手房约 7258

## 三、跑数脚本（scripts/，复用方法）

| 脚本 | 用途 | 要点 |
|---|---|---|
| `fetch_lib.py` | urllib 抓取库 | UA Chrome/120、gzip 解压、`fetch/strip_html/extract_links`；政务站直抓全靠它 |
| `download_bulletin_pdf.py` | 二进制下载 PDF | **必须 `r.read()` 存 'wb'**，见坑 #1 |
| `extract_pdf_text.py` | pdfplumber 提取文本 | venv 装：`uv pip install --python ~/.hermes/hermes-agent/venv/bin/python pdfplumber` |
| `fetch_gjj_attachment_pdf.py` | 公积金中心附件 | 正文页常为空壳，真文在 `.pdf` 附件（正则 `href="[^"]+\.pdf"`） |
| `scan_gjj_file_list.py` | 扫公积金文件列表 | `zxwj/index.jhtml`~`index_6.jhtml` 翻页，正则提 `{id}.jhtml`+标题 |
| `search_sogou_360.py` | 搜索引擎备用 | 360 so.com 对结果链接用 `data-url` 属性；Sogou 限速（每次 sleep 3s+） |
| `fetch_bendibao_mobile.py` | 本地宝正文 | 桌面版 JS 渲染（strip 后仅 124 字符），**加 `m.` 前缀走移动版即静态 HTML** |
| `verify_json_fields.py` | 32 字段完整性校验 | 对照 schema 字段名清单，报 missing/extra/null |
| `patch_haerbin_json.py` | 结构化改 JSON | json.load→改 dict→json.dump(ensure_ascii=False, indent=2)，避免手写 JSON 转义错 |

## 四、环境坑（下次直接绕开）

1. **PDF 二进制陷阱**：`urllib` 响应若经文本处理（如 print/重定向到文件时编码转换），非 ASCII 字节变 `\xef\xbf\xbd`（UTF-8 replacement char），PDF 报 `incorrect startxref` / `Error -3 decompressing`。肉眼 xxd 文件头：`%PDF-1.7\n%\xef\xbf\xbd` 即确诊。解法：`data = r.read()` + `'wb'` 写入。
2. **搜索引擎可用性**（2026-10 时点）：DDG html/lite 全线 202 验证码（换 Clash 代理出口 IP 也没用）；Bing cn 结果是百度百科大杂烩；Sogou 可用但 3~5 次即限速；**360 so.com 最稳**（结果链接在 `data-url` 属性，`/link?m=` 302 跳转带 Referer 才给过）。
3. **政务站正文壳页**：hrbgjj.org.cn 的 zxwj 正文页 strip 后只有导航——真文是 PDF 附件（`bh.hrbgjj.org.cn/u/cms/www/...pdf`）；harbin.gov.cn 人才新政 30 条同理。
4. **本地宝桌面版是 JS 渲染**，strip 后 124 字符；加 `m.` 走移动版，全文直接在 HTML 里。
5. **pip 被禁（PEP 668）**：`uv pip install --python ~/.hermes/hermes-agent/venv/bin/python <pkg>` 装进 hermes venv。
6. web_search/web_extract 工具当时基于 ddgs 已废；browser_exec 守护进程会僵死——全部改 urllib 直抓。
7. 本机 `api.github.com` 可直连，`github.com` 网页被墙；Clash 代理 `http://127.0.0.1:7890`（verge-mihomo 默认不启动）。

## 五、遗留待补

- `unemployment_rate`：哈尔滨市人社局年度人力资源和社会保障事业发展统计公报（未检索到公开发布）
- `avg_commute_minutes`：中规院《中国主要城市通勤监测报告》哈尔滨单程时耗（现值 32min 为同体量北方城市推算，字段内已标注）
- `tier3_hospitals`（36 家为行业名单口径）：逐院名单待省卫健委评审公告核验
- 医保三甲起付线/封顶线：哈尔滨医保局细则
