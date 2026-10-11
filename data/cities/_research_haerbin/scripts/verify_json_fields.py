import json
schema_fields = ['avg_salary_yearly','job_density_index','unemployment_rate','key_industries',
    'price_to_income_ratio','downpayment_median','avg_price_per_sqm','purchase_restrictions','mortgage_rate_first','provident_fund_loan_cap',
    'min_education_for_direct_hukou','social_security_years_required','fresh_graduate_channel','hukou_difficulty_score',
    'pension_base_lower','pension_base_upper','provident_fund_ratio_range','medical_reimbursement_inpatient','maternity_insurance_merged','maternity_allowance_standard','maternity_leave_days','childbirth_subsidy',
    'avg_commute_minutes','tier3_hospitals','aqi_good_days_ratio','education_resources','climate_summary','cultural_facilities_index',
    'fresh_grad_subsidy','rent_subsidy','talent_apartment','policy_stability_note']

data = json.load(open('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/data/cities/haerbin.json'))
all_fields = []
nulls = []
for dim, sub in data['dimensions'].items():
    for k, v in sub.items():
        all_fields.append(f'{dim}.{k}')
        if v['value'] is None:
            nulls.append(f'{dim}.{k}')

hrb_set = set(f.split('.')[1] for f in all_fields)
missing = set(schema_fields) - hrb_set
extra = hrb_set - set(schema_fields)
print(f'haerbin fields: {len(all_fields)}, schema: {len(schema_fields)}')
print(f'missing: {missing or "none"} | extra: {extra or "none"}')
print(f'nulls ({len(nulls)}): {nulls}')
filled = len(all_fields) - len(nulls)
print(f'coverage vs schema: {len(schema_fields)-len(missing)}/{len(schema_fields)} = {(len(schema_fields)-len(missing))*100//len(schema_fields)}%')
print(f'value-filled: {filled}/{len(all_fields)}')

import os
sz = os.path.getsize('/home/leonbook6/IdeaProjects/bbtowel/city-settle-inventory/data/cities/haerbin.json')
print(f'file size: {sz} bytes')