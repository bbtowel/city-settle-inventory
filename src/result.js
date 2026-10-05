// 结果页渲染: 三磁体画像卡 + Top3 城市 + 对比表 + canvas 分享卡
import { matchAll } from './scoring.js';
import { QUESTIONS } from './questions.js';

export function renderResult(answers, rootEl) {
  const { userDims, profile, weights, results } = matchAll(answers, QUESTIONS);
  const top3 = results.slice(0, 3);

  const dimName = { ambition: '事业雄心', lifestyle: '生活偏好', family: '家庭因素', economy: '经济基础', risk: '风险态度' };
  const wName = { opportunity: '经济机会', housing: '买房难度', hukou: '落户易度', livability: '宜居条件', social: '五险一金', talent: '人才政策' };

  rootEl.innerHTML = `
    <div class="result">
      <div class="profile-card" id="profileCard">
        <div class="pc-badge">你的三磁体画像</div>
        <div class="pc-name">${profile.name}</div>
        <div class="pc-tagline">「${profile.tagline}」</div>
        <div class="pc-3lines">
          <p><b>你是谁</b> — ${profile.who}</p>
          <p><b>你的矛盾</b> — ${profile.conflict}</p>
          <p><b>你的路</b> — ${profile.path}</p>
        </div>
      </div>

      <div class="dims-radar">
        <h3>你的五维画像</h3>
        <div class="dims-bar">${Object.entries(dimName).map(([k, n]) => `
          <div class="dim-row"><span>${n}</span>
            <div class="bar"><i style="width:${userDims[k]}%"></i></div>
            <b>${userDims[k]}</b>
          </div>`).join('')}
        </div>
      </div>

      <h3 class="top3-title">最适合你的 3 座城市</h3>
      <div class="city-cards">
        ${top3.map((r, i) => `
        <div class="city-card ${r.filterReasons.length ? 'filtered' : ''}">
          <div class="cc-rank">#${i + 1}</div>
          <div class="cc-name">${r.city.name} <small>${r.city.tier}</small></div>
          <div class="cc-match">${r.match}<small>%</small><span>匹配度</span></div>
          <div class="cc-scores">${Object.entries(wName).map(([k, n]) =>
            `<span class="chip">${n} ${r.scores[k]}</span>`).join('')}</div>
          <div class="cc-meta">
            房价 ${r.city.avg_price_per_sqm} 元/m² · 收入比 ${r.city.price_to_income_ratio} 倍 ·
            落户难度 ${r.city.hukou_difficulty_score}/100 · 通勤 ${r.city.avg_commute_minutes} 分钟
          </div>
          ${r.filterReasons.length ? `<div class="cc-warn">⚠ ${r.filterReasons.join('；')}</div>` : ''}
        </div>`).join('')}
      </div>

      <div class="compare">
        <h3>城市对比</h3>
        <div class="compare-selects">
          <select id="cmpA">${results.map((r, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${r.city.name}</option>`).join('')}</select>
          <span>vs</span>
          <select id="cmpB">${results.map((r, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${r.city.name}</option>`).join('')}</select>
        </div>
        <table id="cmpTable"></table>
      </div>

      <div class="share-row">
        <button id="btnShare">生成分享卡片</button>
        <button id="btnRestart" class="ghost">重新测试</button>
      </div>
      <canvas id="shareCanvas" width="750" height="1200" style="display:none"></canvas>
      <img id="shareImg" style="display:none;max-width:100%">
      <p class="data-note">数据口径: 2026 年各市官方公告(双源交叉验证) · 仅供决策参考, 以官方最新政策为准</p>
    </div>`;

  // 对比表
  const cmpFields = [
    ['房价(元/m²)', c => c.avg_price_per_sqm],
    ['房价收入比', c => c.price_to_income_ratio],
    ['首付中位(万)', c => c.downpayment_median_wan],
    ['首套利率(%)', c => c.mortgage_rate_first],
    ['落户难度(1-100)', c => c.hukou_difficulty_score],
    ['落户社保年限', c => c.social_security_years_required],
    ['通勤(分钟)', c => c.avg_commute_minutes],
    ['三甲医院(家)', c => c.tier3_hospitals],
    ['空气优良率(%)', c => c.aqi_good_days_ratio],
    ['产假(天)', c => c.maternity_leave_days],
  ];
  const renderCmp = () => {
    const a = results[+rootEl.querySelector('#cmpA').value].city;
    const b = results[+rootEl.querySelector('#cmpB').value].city;
    rootEl.querySelector('#cmpTable').innerHTML = `<tr><th></th><th>${a.name}</th><th>${b.name}</th></tr>` +
      cmpFields.map(([n, f]) => `<tr><td>${n}</td><td>${f(a) ?? '—'}</td><td>${f(b) ?? '—'}</td></tr>`).join('');
  };
  rootEl.querySelector('#cmpA').onchange = renderCmp;
  rootEl.querySelector('#cmpB').onchange = renderCmp;
  renderCmp();

  // 分享卡
  rootEl.querySelector('#btnShare').onclick = () => drawShareCard(profile, top3, userDims);
  rootEl.querySelector('#btnRestart').onclick = () => { localStorage.removeItem('guichao_answers'); location.reload(); };
}

function drawShareCard(profile, top3, userDims) {
  const cv = document.getElementById('shareCanvas');
  const ctx = cv.getContext('2d');
  const W = 750, H = 1200;
  // 背景: 克莱因蓝
  ctx.fillStyle = '#002FA7'; ctx.fillRect(0, 0, W, H);
  // 顶部
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "PingFang SC", sans-serif';
  ctx.fillText('归巢 · 城市定居测评', 48, 80);
  ctx.font = '22px "PingFang SC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText(`五维: ${userDims.ambition}/${userDims.lifestyle}/${userDims.family}/${userDims.economy}/${userDims.risk}`, 48, 120);

  // 画像区
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 96px "PingFang SC", sans-serif';
  ctx.fillText(profile.name, 48, 300);
  ctx.font = '34px "PingFang SC", sans-serif';
  ctx.fillStyle = '#F8B500';
  ctx.fillText(`「${profile.tagline}」`, 48, 370);

  // Top3
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = 'bold 32px "PingFang SC", sans-serif';
  ctx.fillText('最适合我的城市', 48, 470);
  top3.forEach((r, i) => {
    const y = 540 + i * 130;
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(48, y, W - 96, 108);
    ctx.fillStyle = '#F8B500';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`#${i + 1}`, 72, y + 68);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px "PingFang SC", sans-serif';
    ctx.fillText(r.city.name, 170, y + 66);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`${r.match}%`, W - 140, y + 66);
  });

  // 底部
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = '24px "PingFang SC", sans-serif';
  ctx.fillText('扫码测测你该去哪座城市 →', 48, H - 60);

  const img = document.getElementById('shareImg');
  img.src = cv.toDataURL('image/png');
  img.style.display = 'block';
  cv.style.display = 'none';
  // 尝试下载
  const a = document.createElement('a');
  a.href = img.src; a.download = `归巢-${profile.name}.png`; a.click();
}
