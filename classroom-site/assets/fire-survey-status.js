(() => {
  'use strict';

  // 수요조사 현황 (숫자만). /api/fire-survey/summary 를 읽어 그린다.
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const bar = (label, n, total) => {
    const pct = total ? Math.round(n / total * 100) : 0;
    return `<div class="sv-bar"><span class="sv-label">${esc(label)}</span><span class="sv-track"><span style="width:${pct}%"></span></span><b>${n}명</b></div>`;
  };
  const group = (title, labels, counts, total, note = '') =>
    `<h2>${esc(title)}</h2>${note ? `<p class="note">${note}</p>` : ''}${Object.entries(labels).map(([k, v]) => bar(v, counts[k] || 0, total)).join('')}`;

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
    const verdict = d.want > d.seats
      ? `참여 희망 <b>${d.want}명</b> · 차수 정원(${d.seats}명)을 넘어 <b>2차까지 운영</b>을 검토합니다.`
      : `참여 희망 <b>${d.want}명</b> · 지금은 차수 정원(${d.seats}명) 안이라 <b>1차만 운영</b>해도 됩니다.`;
    const when = d.lastAt ? new Date(d.lastAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    host.innerHTML = `
      <div class="sv-cards">
        <div class="sv-card"><small>응답</small><b>${d.n}<span>/${d.staff}명</span></b><small>응답률 ${Math.round(d.n / d.staff * 100)}%</small></div>
        <div class="sv-card"><small>참여 희망</small><b>${d.want}<span>명</span></b><small>꼭 ${d.intents.yes} · 일정 맞으면 ${d.intents.maybe}</small></div>
        <div class="sv-card"><small>주말 둘 다 어려움</small><b>${d.weekendNo}<span>명</span></b><small>참여 희망자 중</small></div>
      </div>
      <p class="sv-verdict">${verdict}</p>
      <p class="note">${d.closed ? '조사가 마감되었습니다.' : `조사 마감 ${new Date(d.close).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`} · 마지막 응답 ${when}</p>
      ${group('참여 의향', L.INTENTS, d.intents, d.n)}
      <h2>예정 일정(금 저녁 + 토 오전) 가능</h2><p class="note">참여 희망자 ${d.want}명 기준</p>
      ${bar('1차 11. 6.~7.', d.can1, d.want)}${bar('2차 11. 20.~21.', d.can2, d.want)}${bar('둘 다 어려움', d.weekendNo, d.want)}
      ${group('평일이라면 가능한 방식', L.MODES, d.modes, d.want, `참여 희망자 기준 (여러 개 선택) · 주말이 둘 다 어려운 ${d.weekendNo}명 중: ${Object.entries(L.MODES).map(([k, v]) => `${esc(v)} ${d.modesWeekendNo[k]}`).join(', ')}`)}
      ${group('평일 가능 요일', L.DAYS, d.days, d.want)}
      ${group('평일 가능 시기', L.WEEKS, d.weeks, d.want)}
      ${group('AI 사용 경험', L.EXPS, d.exps, d.n)}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const host = document.getElementById('survey-status');
    if (!host) return;
    load(host);
    document.getElementById('survey-refresh')?.addEventListener('click', () => load(host));
  });
})();
