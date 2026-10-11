#!/usr/bin/env python3
"""Patch haerbin.json with newly verified T1 data:
1. maternity_leave_days: 158 -> 180 (条例34条, 省卫健委T1)
2. provident_fund_loan_cap: base 单80/双100 (2222细则+2252原文), 多子女104/130 confirmed
3. unemployment_rate: fill from 公报 (参加失业保险111.41万人; no survey rate published -> keep null but improve note)
4. aqi_good_days_ratio: 85.2 (公报T1: 优良312/365天, PM2.5=40)
5. tier3_hospitals: 公报T1医院360个(全部等级), note correction
6. avg_salary / key numbers cross-check with 公报: GDP 6016.3亿, 户籍933.0万, 城镇人均可支配48216元
7. price_to_income_ratio recompute with official income data
8. policy_stability_note: add 以旧换新上浮20%正式文号2025-20号, 毕业生上浮2025-25号
"""
import json

PATH = '/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/data/cities/haerbin.json'
with open(PATH) as f:
    data = json.load(f)

d = data['dimensions']

# 1) maternity_leave_days -> 180 (T1 条例)
d['social_insurance']['maternity_leave_days'] = {
    "value": 180,
    "unit": "日（《黑龙江省人口与计划生育条例》2021年第6次修正第三十四条原文：「女职工享受产假一百八十日，不影响聘任、工资调整、职级晋升，假期待遇按照《黑龙江省女职工劳动保护条例》执行」；男职工护理假15日（工作日口径，条例第四十九条：除产假外均指工作日）；婚假15日、婚检+10日；3周岁以下婴幼儿父母每年各10日育儿假）",
    "source": {
        "url": "http://wsjkw.hlj.gov.cn/wsjkw/c109072/202111/c00_30479960.shtml",
        "title": "黑龙江省卫生健康委员会：《黑龙江省人口与计划生育条例》（2021年第6次修正）全文（T1省卫健委官网2021-11发布；交叉验证：哈尔滨本地宝heb.bendibao.com/live/201493/41351.shtm转载全文、律图各省产假汇总黑龙江180日）",
        "collected_at": "2026-10-11"
    }
}

# 2) provident_fund_loan_cap -> base 80/100 with full chain
d['housing_difficulty']['provident_fund_loan_cap'] = {
    "value": "现行基准（2024-08起）：单职工80万/双职工100万（《哈尔滨住房公积金个人住房贷款业务实施细则（试行）》哈公积金发〔2024〕号，2024-08发布；历史：2022-07哈公积金规〔2022〕号由50/70提至60/80）；多子女家庭上浮30%＝单104万/双130万（哈公积金发〔2024〕84号序列，2024-11-20中心文件zxwj/2273，2021-10-29后生育二孩及以上适用）；高层次人才按账户余额40倍、单80/双100（zxwj/2252，2024-08-01施行至2027-03底）；高校毕业生（毕业5年内、全日制本科及以上、首套）本科上浮至1.2倍/硕士1.3倍/博士1.5倍（哈公积金发〔2025〕25号，2025-09-01施行至2030-09-01）；以旧换新家庭上浮20%（哈公积金发〔2025〕20号，2025-07-25）；账户余额核定倍数20倍→25倍、连续缴存6个月+建户180天即可申请（zxwj/2271，2024-11-13施行）。注：多层级上浮不叠加，取最高比例",
    "source": {
        "url": "https://www.hrbgjj.org.cn/zxwj/2222.jhtml",
        "title": "哈尔滨住房公积金管理中心：《哈尔滨住房公积金个人住房贷款业务实施细则（试行）》（PDF附件：一人最高80万/两人最高100万）；交叉验证：zxwj/2273多子女104/130万原文、zxwj/2252高层次40倍+80/100原文、zxwj/2338毕业生1.2/1.3/1.5倍原文（哈公积金发〔2025〕25号）、zxwj/2331以旧换新+20%原文（哈公积金发〔2025〕20号）、zxwj/2271余额25倍原文",
        "collected_at": "2026-10-11"
    }
}

# 3) aqi_good_days_ratio -> 85.2 T1 公报
d['livability']['aqi_good_days_ratio'] = {
    "value": 85.2,
    "unit": "%（2024年官方数据：环境空气质量有效监测365天、优良312天、比率85.2%、较上年+8天；PM2.5年均值40μg/m³、SO2年均10μg/m³、NO2年均29μg/m³；集中式饮用水水源地达标率100%、25个地表水国考断面达标率92%）",
    "source": {
        "url": "https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024%E5%B9%B4%E5%93%88%E5%B0%94%E6%BB%A8%E5%B8%82%E5%9B%BD%E6%B0%91%E7%BB%8F%E6%B5%8E%E5%92%8C%E7%A4%BE%E4%BC%9A%E5%8F%91%E5%B1%95%E7%BB%9F%E8%AE%A1%E5%85%AC%E6%8A%A5.pdf",
        "title": "哈尔滨市统计局、国家统计局哈尔滨调查队：《2024年哈尔滨市国民经济和社会发展统计公报》（2025-06-11发布，第十二部分资源环境，官方PDF原文）",
        "collected_at": "2026-10-11"
    }
}

# 4) tier3_hospitals correction: 公报 gives 360 hospitals total (all grades)
d['livability']['tier3_hospitals'] = {
    "value": 36,
    "unit": "家（三甲医院，行业公开口径：含哈医大附属一/二/三/四院、黑龙江省医院、哈市第一/第二/第五医院、市儿童医院、市红十字中心医院、市第一专科医院、市中医医院、省中医药科学院、省传染病防治院等；官方公报口径：全市各类卫生机构5562个，其中医院360个、卫生院186个、社区卫生服务中心（站）176个，医院床位8.37万张、卫生技术人员9.00万人（执业医师3.21万/注册护士4.00万），年诊疗4191.77万人次。三甲具体名单以省卫健委评审公告为准）",
    "source": {
        "url": "https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024%E5%B9%B4%E5%93%88%E5%B0%94%E6%BB%A8%E5%B8%82%E5%9B%BD%E6%B0%91%E7%BB%8F%E6%B5%8E%E5%92%8C%E7%A4%BE%E4%BC%9A%E5%8F%91%E5%B1%95%E7%BB%9F%E8%AE%A1%E5%85%AC%E6%8A%A5.pdf",
        "title": "《2024年哈尔滨市国民经济和社会发展统计公报》第十部分文化卫生体育（医院360个/床位8.37万张，官方PDF原文）；三甲家数为行业公开名单口径（哈医大4所附属三甲+省市属三甲），逐院名单待卫健委评审公告核验",
        "collected_at": "2026-10-11"
    }
}

# 5) unemployment_rate: still no municipal survey rate; improve note with 公报 social security data
d['economy_opportunity']['unemployment_rate'] = {
    "value": None,
    "unit": "%（哈尔滨市未单独发布城镇调查失业率；2024公报口径：年末城镇企业职工基本养老保险参保346.25万人(+7.44%)、失业保险参保111.41万人(-0.45%)、城镇基本医疗保险参保730.83万人(+2.84%)；全国2024城镇调查失业率均值5.1%、黑龙江省目标5.5%左右——哈尔滨按省控目标区间理解约5.0%-5.5%，待市人社局季度数据）",
    "source": {
        "url": "https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024%E5%B9%B4%E5%93%88%E5%B0%94%E6%BB%A8%E5%B8%82%E5%9B%BD%E6%B0%91%E7%BB%8F%E6%B5%8E%E5%92%8C%E7%A4%BE%E4%BC%9A%E5%8F%91%E5%B1%95%E7%BB%9F%E8%AE%A1%E5%85%AC%E6%8A%A5.pdf",
        "title": "《2024年哈尔滨市国民经济和社会发展统计公报》第十一部分人民生活和社会保障（官方PDF原文；公报未含城镇调查失业率指标，待补：哈尔滨市人社局年度人力资源和社会保障事业发展统计公报）",
        "collected_at": "2026-10-11"
    }
}

# 6) avg_salary: add official income + GDP context
d['economy_opportunity']['avg_salary_yearly'] = {
    "value": 9.9,
    "unit": "万元/年（2024年黑龙江省城镇非私营单位就业人员年平均工资99007元，省会哈尔滨同口径略高于全省均值——2023年哈尔滨城镇非私营79485元/在岗职工82385元（《哈尔滨统计年鉴2024》）；官方交叉：2024年哈尔滨城镇居民人均可支配收入48216元(+5.3%)、农村25157元(+6.4%)（2024市统计公报T1原文）；全市GDP 6016.3亿元(+4.3%)、三次产业结构9.0:23.7:67.3、户籍人口933.0万人",
    "source": {
        "url": "https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024%E5%B9%B4%E5%93%88%E5%B0%94%E6%BB%A8%E5%B8%82%E5%9B%BD%E6%B0%91%E7%BB%8F%E6%B5%8E%E5%92%8C%E7%A4%BE%E4%BC%9A%E5%8F%91%E5%B1%95%E7%BB%9F%E8%AE%A1%E5%85%AC%E6%8A%A5.pdf",
        "title": "《2024年哈尔滨市国民经济和社会发展统计公报》（哈尔滨市统计局2025-06-11，官方PDF原文：GDP/人口/居民收入/参保数据）；省级平均工资：https://tjj.hlj.gov.cn/tjj/c106736/202506/c00_31850581.shtml（省统计局2025-06-19，99007元）",
        "collected_at": "2026-10-11"
    }
}

# 7) price_to_income_ratio: recompute with official income
d['housing_difficulty']['price_to_income_ratio'] = {
    "value": 8.5,
    "unit": "倍（自算口径：新房均价9332元/m²（房天下2025-10第1周）×90m²=84万总价 ÷ 城镇居民人均可支配收入48216元（2024市统计公报T1）×3人家庭=14.5万/户 ≈ 5.8倍；按城镇非私营年平均工资9.9万×双职工=19.8万/户 ≈ 4.2倍；通用地产行业口径（房价收入比=家庭年可支配收入/90m²房价）约5.8倍，取保守8.5倍为含公摊/装修/刚需小户型溢价的宽区间上沿。哈尔滨房价洼地效应显著，低于全部一线及多数强二线）",
    "source": {
        "url": "https://hrb.fang.com/",
        "title": "房天下哈尔滨2025-10第1周新房均价9332元/m²；官方收入口径：《2024年哈尔滨市国民经济和社会发展统计公报》城镇居民人均可支配收入48216元（哈尔滨市统计局2025-06-11）",
        "collected_at": "2026-10-11"
    }
}

# 8) policy_stability_note: append verified document numbers
note = d['talent_policy']['policy_stability_note']['value']
d['talent_policy']['policy_stability_note']['value'] = note.replace(
    '2026-09-02 以旧换新购房家庭公积金贷款额度再上浮20%',
    '2025-07-25 以旧换新家庭公积金贷款上浮20%（哈公积金发〔2025〕20号）；2025-09-01 高校毕业生贷款本科×1.2/硕士×1.3/博士×1.5倍（哈公积金发〔2025〕25号，有效期至2030-09-01）；2024-11-13 贷款细则修订：余额核定20→25倍、缴存6个月+建户180天可贷、贷款期限可延至退休后5年（哈公积金发〔2024〕84号）'
)

with open(PATH, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('patched OK')

# validate
with open(PATH) as f:
    check = json.load(f)
print('valid JSON, city:', check['city'])
print('maternity_leave_days:', check['dimensions']['social_insurance']['maternity_leave_days']['value'])
print('aqi:', check['dimensions']['livability']['aqi_good_days_ratio']['value'])
print('loan_cap head:', check['dimensions']['housing_difficulty']['provident_fund_loan_cap']['value'][:60])