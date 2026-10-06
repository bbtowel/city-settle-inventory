// 自动生成: data/questions.json -> src/questions.js (勿手改)
export const QUESTIONS = [
  {
    "id": "A01",
    "dimension": "ambition",
    "subdimension": "growth_ceiling",
    "type": "scenario",
    "text": "A城薪资高30%但通勤90分钟,B城薪资低20%通勤20分钟,你选?",
    "options": [
      "坚定选B(生活优先)",
      "倾向B",
      "倾向A",
      "坚定选A(机会优先)"
    ],
    "reverse": false,
    "maps_to": "weight_ambition"
  },
  {
    "id": "A02",
    "dimension": "ambition",
    "subdimension": "industry_concentration",
    "type": "likert",
    "text": "我所在的行业,只有在头部城市才有足够的机会和跳槽空间",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "filter_industry_density + weight_ambition"
  },
  {
    "id": "A03",
    "dimension": "ambition",
    "subdimension": "plateau_tolerance",
    "type": "likert",
    "text": "如果工作稳定但一眼能看到十年后的样子,我能接受",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": true,
    "maps_to": "weight_ambition"
  },
  {
    "id": "A04",
    "dimension": "ambition",
    "subdimension": "income_priority",
    "type": "scenario",
    "text": "未来三年,收入增长和生活质量只能优先保一个,我保:",
    "options": [
      "坚定保生活质量",
      "倾向生活质量",
      "倾向收入",
      "坚定保收入"
    ],
    "reverse": false,
    "maps_to": "weight_ambition"
  },
  {
    "id": "A05",
    "dimension": "ambition",
    "subdimension": "entrepreneurship",
    "type": "likert",
    "text": "我有在5年内创业或做自由职业的打算",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_ambition + filter_remote_friendly"
  },
  {
    "id": "A06",
    "dimension": "ambition",
    "subdimension": "status_weight",
    "type": "likert",
    "text": "所在城市的'级别'(一线/新一线)本身对我很重要",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_ambition + profile_only"
  },
  {
    "id": "A07",
    "dimension": "ambition",
    "subdimension": "overtime_tolerance",
    "type": "scenario",
    "text": "一份高薪但需要常态化加班到21点的工作,你的态度是?",
    "options": [
      "绝不接受",
      "短期可以,长期不行",
      "看钱够不够",
      "可以接受,年轻就该拼"
    ],
    "reverse": false,
    "maps_to": "weight_ambition"
  },
  {
    "id": "L01",
    "dimension": "lifestyle",
    "subdimension": "climate",
    "type": "likert",
    "text": "冬天的湿冷/夏天的闷热会显著影响我的心情和状态",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_livability_climate"
  },
  {
    "id": "L02",
    "dimension": "lifestyle",
    "subdimension": "food",
    "type": "likert",
    "text": "长期吃不到合口味的饭菜,我会明显不适应",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_livability_food"
  },
  {
    "id": "L03",
    "dimension": "lifestyle",
    "subdimension": "dialect",
    "type": "likert",
    "text": "在方言为主的城市生活,我有信心半年内融入",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": true,
    "maps_to": "weight_livability_culture"
  },
  {
    "id": "L04",
    "dimension": "lifestyle",
    "subdimension": "weekend",
    "type": "factual",
    "text": "过去一个月,你周末更常做的是?",
    "options": [
      "基本宅家",
      "市内逛吃/看展",
      "近郊徒步/露营",
      "出城短途旅行"
    ],
    "reverse": false,
    "maps_to": "weight_livability_nature"
  },
  {
    "id": "L05",
    "dimension": "lifestyle",
    "subdimension": "pace",
    "type": "scenario",
    "text": "一座'什么都慢半拍'的城市(办事慢、人少、夜生活少),你觉得?",
    "options": [
      "完全无法忍受",
      "会焦虑但能忍",
      "挺舒服的",
      "这就是我想要的"
    ],
    "reverse": false,
    "maps_to": "weight_livability_pace"
  },
  {
    "id": "L06",
    "dimension": "lifestyle",
    "subdimension": "social",
    "type": "likert",
    "text": "朋友/社交圈的质量,比城市本身的硬件设施更重要",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_livability_social + profile_only"
  },
  {
    "id": "L07",
    "dimension": "lifestyle",
    "subdimension": "culture_need",
    "type": "factual",
    "text": "过去半年,你去过几次Livehouse/剧场/美术馆/博物馆?",
    "options": [
      "0次",
      "1-2次",
      "3-5次",
      "6次以上"
    ],
    "reverse": false,
    "maps_to": "weight_livability_culture"
  },
  {
    "id": "F01",
    "dimension": "family",
    "subdimension": "marital_status",
    "type": "factual",
    "text": "你目前的状态是?",
    "options": [
      "单身,3年内不打算结婚",
      "单身,可能3年内结婚",
      "已婚/稳定伴侣,暂无孩子",
      "已婚,有孩子或备孕中"
    ],
    "reverse": false,
    "maps_to": "weight_family + filter_education"
  },
  {
    "id": "F00",
    "dimension": "family",
    "subdimension": "home_region",
    "type": "calibration",
    "text": "你的父母家(家乡)在哪个地区? (用于计算城市离家的实际距离)",
    "options": [
      "华北(京津冀/山西/内蒙古)",
      "东北(黑吉辽)",
      "华东(江浙沪皖/山东/福建等)",
      "华中(湖南/湖北/河南/江西)",
      "华南(广东/广西/海南)",
      "西南(川渝/云贵)",
      "西北(陕甘宁/新疆/青海)",
      "海外 / 其他"
    ],
    "reverse": false,
    "maps_to": "calibration_home_region"
  },
  {
    "id": "F02",
    "dimension": "family",
    "subdimension": "parents_distance",
    "type": "scenario",
    "text": "父母离你定居城市的理想距离是?",
    "options": [
      "同城最好",
      "高铁2小时内",
      "飞机3小时内",
      "距离无所谓"
    ],
    "reverse": true,
    "maps_to": "weight_family_distance"
  },
  {
    "id": "F03",
    "dimension": "family",
    "subdimension": "parent_care",
    "type": "likert",
    "text": "未来5年,父母养老/医疗需要我频繁到场的可能性很高",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_family_distance + weight_medical"
  },
  {
    "id": "F04",
    "dimension": "family",
    "subdimension": "education",
    "type": "likert",
    "text": "(若有孩子或计划要)学区/教育资源是我选城市的前三考虑项",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_education"
  },
  {
    "id": "F05",
    "dimension": "family",
    "subdimension": "spouse_employment",
    "type": "scenario",
    "text": "若你和伴侣的工作机会在不同城市,你们会?",
    "options": [
      "坚定一方随迁",
      "看哪边机会好",
      "尽量同城,可妥协一方发展",
      "各自发展,接受异地"
    ],
    "reverse": false,
    "maps_to": "weight_family + filter_dual_city"
  },
  {
    "id": "F06",
    "dimension": "family",
    "subdimension": "family_support",
    "type": "factual",
    "text": "在买房首付上,家庭能提供的支持大约是?",
    "options": [
      "基本没有",
      "10万以内",
      "10-30万",
      "30万以上"
    ],
    "reverse": false,
    "maps_to": "filter_budget + weight_economy"
  },
  {
    "id": "E01",
    "dimension": "economy",
    "subdimension": "downpayment",
    "type": "factual",
    "text": "你现在可动用的买房首付预算(含家庭支持)大约是?",
    "options": [
      "暂无(0-20万)",
      "20-50万",
      "50-100万",
      "100万以上"
    ],
    "reverse": false,
    "maps_to": "filter_budget_F1"
  },
  {
    "id": "E02",
    "dimension": "economy",
    "subdimension": "monthly_income",
    "type": "factual",
    "text": "你目前的税后月收入(或预期offer)大约是?",
    "options": [
      "8k以下",
      "8k-15k",
      "15k-25k",
      "25k以上"
    ],
    "reverse": false,
    "maps_to": "filter_mortgage_safety + weight_economy"
  },
  {
    "id": "E03",
    "dimension": "economy",
    "subdimension": "mortgage_ratio",
    "type": "scenario",
    "text": "月供占税后收入的比例,你能接受的安全线是?",
    "options": [
      "20%以内",
      "30%",
      "40%",
      "50%以上(高杠杆也能扛)"
    ],
    "reverse": false,
    "maps_to": "filter_mortgage_safety"
  },
  {
    "id": "E04",
    "dimension": "economy",
    "subdimension": "savings_buffer",
    "type": "scenario",
    "text": "如果失业,你的存款能撑几个月不慌?",
    "options": [
      "3个月以内",
      "3-6个月",
      "6-12个月",
      "12个月以上"
    ],
    "reverse": false,
    "maps_to": "weight_risk_buffer"
  },
  {
    "id": "E05",
    "dimension": "economy",
    "subdimension": "rent_tolerance",
    "type": "scenario",
    "text": "在目标城市,你能接受的长期月租/房租支出上限是?",
    "options": [
      "2000以内",
      "2000-3500",
      "3500-5000",
      "5000以上"
    ],
    "reverse": false,
    "maps_to": "filter_rent_budget"
  },
  {
    "id": "E06",
    "dimension": "economy",
    "subdimension": "debt",
    "type": "likert",
    "text": "我目前有消费贷/车贷/其他负债,月供压力不小",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "filter_mortgage_safety + weight_economy"
  },
  {
    "id": "R01",
    "dimension": "risk",
    "subdimension": "policy_change",
    "type": "scenario",
    "text": "如果你目标城市明年取消了你符合的落户/补贴政策,你会?",
    "options": [
      "立刻换城市",
      "观望一年再说",
      "该留还是留",
      "本来就没指望政策"
    ],
    "reverse": true,
    "maps_to": "weight_policy_stability"
  },
  {
    "id": "R02",
    "dimension": "risk",
    "subdimension": "remote_work",
    "type": "factual",
    "text": "你的工作性质,远程/异地办公的可行性有多高?",
    "options": [
      "完全不可能(必须到岗)",
      "偶尔可以",
      "一半以上可远程",
      "完全远程友好"
    ],
    "reverse": false,
    "maps_to": "filter_remote_friendly + weight_location_freedom"
  },
  {
    "id": "R03",
    "dimension": "risk",
    "subdimension": "sunk_cost",
    "type": "likert",
    "text": "一旦在一个城市买了房,即使发展不如预期我也不会轻易离开",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_mobility"
  },
  {
    "id": "R04",
    "dimension": "risk",
    "subdimension": "subsidy_motivation",
    "type": "likert",
    "text": "人才补贴/购房补贴会显著影响我对一个城市的选择",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_talent_policy"
  },
  {
    "id": "R05",
    "dimension": "risk",
    "subdimension": "job_stability",
    "type": "likert",
    "text": "相比高薪,我更看重工作的稳定性(不易被裁/行业不夕阳)",
    "options": [
      "完全不同意",
      "不太同意",
      "比较同意",
      "完全同意"
    ],
    "reverse": false,
    "maps_to": "weight_industry_stability"
  },
  {
    "id": "R06",
    "dimension": "risk",
    "subdimension": "reversibility",
    "type": "scenario",
    "text": "你认为'定居'对你而言是一个__的决定?",
    "options": [
      "不可逆,定了就是一辈子",
      "很难改,成本高",
      "可以改,但尽量一次选对",
      "随时可改,人生处处是出口"
    ],
    "reverse": false,
    "maps_to": "weight_mobility + profile_only"
  }
];
export const DIMENSIONS = {
  "ambition": {
    "name": "事业雄心",
    "weight_base": 0.2,
    "count_target": 7
  },
  "lifestyle": {
    "name": "生活偏好",
    "weight_base": 0.2,
    "count_target": 7
  },
  "family": {
    "name": "家庭因素",
    "weight_base": 0.2,
    "count_target": 6
  },
  "economy": {
    "name": "经济基础",
    "weight_base": 0.2,
    "count_target": 6
  },
  "risk": {
    "name": "风险态度",
    "weight_base": 0.2,
    "count_target": 6
  }
};
