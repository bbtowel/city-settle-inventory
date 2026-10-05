# 归巢 · 城市定居测评

> 你该在哪座城市扎根？32 题情景测评 + 2026 年最新官方政策数据，给出你的三磁体画像与 Top 3 定居城市。

**理论基础**：霍华德《明日的田园城市》（三磁体）× 芒福德《城市发展史》（城市是人的容器）——不止算经济账，更算生活账。

## 快速开始

```bash
# 本地运行 (任一静态服务器)
python3 -m http.server 8765
# 打开 http://localhost:8765
```

纯前端应用，零后端、零依赖、零构建。数据全部内置于 `src/cities.js`。

## 目录结构

```
├── index.html          # 单页应用: 欢迎页 → 32题答题流 → 结果页
├── src/
│   ├── questions.js    # 32 题 (自动生成自 data/questions.json)
│   ├── cities.js       # 8 城数据 (自动生成自 data/cities/*.json)
│   ├── scoring.js      # 匹配引擎: 过滤→归一化→动态加权→排序
│   └── result.js       # 结果渲染 + canvas 分享卡
├── data/
│   ├── questions.json  # 题库源 (LLM 出题 + 人工审校, 含 maps_to 数据流)
│   └── cities/         # 8 城原始数据 (每字段带官方来源, 双源交叉验证)
├── docs/               # 提纲/题库设计/数据流程/增长手册
└── test/smoke.mjs      # 算法冒烟测试 (node test/smoke.mjs)
```

## 数据流

```
答题(32) → scoreUser 五维得分(0-100) → profileOf 三磁体画像(9型)
        → filterCity 硬性过滤(预算)   → cityScores 城市六维(0-100)
        → weightsOf 动态权重          → matchAll 匹配度排序 → Top3 + 对比 + 分享卡
```

题库每题的 `maps_to` 字段声明其数据流向（`weight_*` 权重 / `filter_*` 过滤 / `profile_only` 画像文案），见 `docs/question-design.md`。

## 数据更新

城市数据在 `data/cities/<pinyin>.json`（26+ 字段，含来源 URL）。更新数据后重新生成 JS：

```bash
node scripts/build-data.mjs   # data/*.json → src/*.js
```

数据版本：每城 `data_version` 字段，政策更新时 +1。

## 测试

```bash
node test/smoke.mjs
# 模拟 5 类典型用户(高事业/低预算/家庭型/数字游民/求稳), 验证画像与 Top3 合理性
```

## 数据口径与免责

- 所有政策数据以各市官方公告为准（双源交叉验证，来源见各 JSON `source` 字段）
- 采集时间：2026-09/10，`collected_at` 标注
- 本测评仅供决策参考，不构成任何投资/法律建议
