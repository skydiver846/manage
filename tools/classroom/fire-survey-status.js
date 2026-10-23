(() => {
  'use strict';

  // 수요조사 현황 (숫자만). /api/fire-survey/summary 를 읽어 그린다.
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  // 막대 하나. tone은 색 구분용(sv-c1~sv-c5, sv-mute), top이면 "가장 많음" 표시
  const bar = (label, n, total, tone, top = false) => {
    const pct = total ? Math.round(n / total * 100) : 0;
    return `<div class="sv-bar ${tone}${top ? ' sv-top' : ''}"><span class="sv-label">${esc(label)}${top ? ' <em>가장 많음</em>' : ''}</span><span class="sv-num"><b>${n}명</b> <small>${pct}%</small></span><span class="sv-track"><span style="width:${pct}%"></span></span></div>`;
  };
  // 가장 많은 것 하나에만 표시 (0명이거나 같은 수가 여럿이면 표시 안 함)
  const bars = (labels, counts, total, tones) => {
    const vals = Object.keys(labels).map(k => counts[k] || 0);
    const max = Math.max(0, ...vals);
    const unique = max > 0 && vals.filter(v => v === max).length === 1;
    return Object.entries(labels).map(([k, v], i) => bar(v, counts[k] || 0, total, tones[i] || tones[tones.length - 1], unique && counts[k] === max)).join('');
  };
  const section = (no, title, note, body, kind) =>
    `<section class="sv-sec ${kind}"><h2><span class="sv-no">${no}</span>${esc(title)}</h2>${note ? `<p class="sv-note">${note}</p>` : ''}${body}</section>`;

  async function load(host) {
    host.innerHTML = '<p class="quiz-status">불러오는 중입니다…</p>';
    let d;
    try {
      const response = await fetch('/api/fire-survey/summary', { cache: 'no-store' });
      d = await response.json();
      if (!response.ok) throw new Error(d.error || `서버 오류 (${response.status})`);
    } catch (error) {
      host.innerHTML = `<p class="quiz-status">현황을 불러오지 못했습니다. ${esc(error.message)}</p>`;
      return;
    }
    const L = d.labels;
    const two = d.want > d.seats;
    const verdict = two
      ? `참여 희망 <b>${d.want}명</b>이 차수 정원(${d.seats}명)을 넘습니다 → <b>2차까지 운영</b> 검토`
      : `참여 희망 <b>${d.want}명</b>으로 차수 정원(${d.seats}명) 안입니다 → <b>1차만 운영</b> 가능`;
    const fmt = t => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const weekendNote = d.weekendNo
      ? `주말이 둘 다 어려운 <b>${d.weekendNo}명</b>이 고른 방식: ${Object.entries(L.MODES).map(([k, v]) => `${esc(v)} <b>${d.modesWeekendNo[k]}</b>`).join(' · ')}`
      : '주말이 둘 다 어려운 사람은 아직 없습니다.';
    host.innerHTML = `
      <div class="sv-cards">
        <div class="sv-card"><small>응답</small><b>${d.n}<span>/${d.staff}명</span></b><small>응답률 ${Math.round(d.n / d.staff * 100)}%</small></div>
        <div class="sv-card sv-hi"><small>참여 희망</small><b>${d.want}<span>명</span></b><small>꼭 ${d.intents.yes} · 일정 맞으면 ${d.intents.maybe}</small></div>
        <div class="sv-card"><small>주말 어려움</small><b>${d.weekendNo}<span>명</span></b><small>참여 희망자 중</small></div>
      </div>
      <p class="sv-verdict ${two ? 'sv-two' : 'sv-one'}">${verdict}</p>
      <p class="sv-time">${d.closed ? '조사 마감됨' : `조사 마감 ${fmt(d.close)}`} · 마지막 응답 ${d.lastAt ? fmt(d.lastAt) : '-'}</p>
      ${section('1', '참여 의향', `전체 응답 ${d.n}명 기준`, bars(L.INTENTS, d.intents, d.n, ['sv-c1', 'sv-c2', 'sv-mute']), 'sv-k1')}
      ${section('2', '예정 일정 (금 저녁 + 토 오전)', `참여 희망 ${d.want}명 기준 · 둘 다 가능한 사람은 1차·2차에 모두 셉니다`,
        bar('1차 11. 6.(금)~7.(토)', d.can1, d.want, 'sv-c3') + bar('2차 11. 20.(금)~21.(토)', d.can2, d.want, 'sv-c4') + bar('둘 다 어려움', d.weekendNo, d.want, 'sv-mute'), 'sv-k2')}
      ${section('3', '평일이라면', `참여 희망 ${d.want}명 기준 · 여러 개 선택`,
        `<h3>방식</h3>${bars(L.MODES, d.modes, d.want, ['sv-c5'])}<p class="sv-note">${weekendNote}</p>
         <h3>요일</h3>${bars(L.DAYS, d.days, d.want, ['sv-c5'])}
         <h3>시기</h3>${bars(L.WEEKS, d.weeks, d.want, ['sv-c5'])}`, 'sv-k3')}
      ${section('4', 'AI 사용 경험', `전체 응답 ${d.n}명 기준 · 수업 난이도 참고`, bars(L.EXPS, d.exps, d.n, ['sv-mute', 'sv-c2', 'sv-c3', 'sv-c1']), 'sv-k4')}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const host = document.getElementById('survey-status');
    if (!host) return;
    load(host);
    document.getElementById('survey-refresh')?.addEventListener('click', () => load(host));
  });
})();
