(() => {
  'use strict';

  // 사전 수요조사 (생성형 AI 활용능력 향상교육).
  // 서버(/api/fire-survey/…)에 저장하고, 강사는 관리 비밀번호로 집계를 봅니다.
  const API = '/api/fire-survey';
  const ADMIN_KEY = 'fire-ai-quiz-admin';   // 오늘의 퀴즈·교육 신청과 같은 관리 비밀번호
  const STAFF = 42;                         // 교직원 수 (응답률 계산)
  const SEATS = 20;                         // 차수별 정원
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const $ = (root, sel) => root.querySelector(sel);
  const checked = (form, name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

  async function call(path, body) {
    let response;
    try {
      response = await fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(body) });
    } catch (_) {
      throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
    let data = {};
    try { data = await response.json(); } catch (_) { /* 본문이 JSON이 아님 */ }
    if (!response.ok) throw new Error(data.error || `서버에서 문제가 생겼습니다 (${response.status}).`);
    return data;
  }

  // ── 조사표 ──
  function mountForm(host) {
    const form = $(host, 'form');
    const status = $(host, '.signup-status');
    const done = $(host, '.signup-done');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const f = form.elements;
      const body = {
        name: f.name.value, dept: f.dept.value, rank: f.rank.value,
        intent: f.intent.value, cohort: f.cohort.value,
        modes: checked(form, 'modes'), modeEtc: f.modeEtc.value,
        days: checked(form, 'days'), weeks: checked(form, 'weeks'),
        exp: f.exp.value, tools: checked(form, 'tools'), toolEtc: f.toolEtc.value,
        wish: f.wish.value, agree: f.agree.checked
      };
      const button = $(form, 'button[type="submit"]');
      button.disabled = true;
      status.textContent = '보내는 중입니다…';
      try {
        const data = await call('submit', body);
        status.textContent = '';
        form.hidden = true;
        done.hidden = false;
        $(done, '.signup-done-title').textContent = data.updated
          ? `${data.name}님, 응답을 고쳤습니다. 감사합니다.`
          : `${data.name}님, 응답해 주셔서 감사합니다.`;
        done.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    $(done, '.signup-again').addEventListener('click', () => {
      done.hidden = true;
      form.hidden = false;
    });
  }

  // ── 담당자용 집계 ──
  function mountAdmin(host) {
    const keyInput = $(host, '#survey-key');
    const status = $(host, '.signup-admin-status');
    const view = $(host, '.signup-admin-view');
    let rows = [], L = {};
    try { keyInput.value = sessionStorage.getItem(ADMIN_KEY) || ''; } catch (_) { /* 저장소 없음 */ }

    const names = (list, labels) => (list || []).map(v => labels[v]).filter(Boolean).join(', ');
    const weekday = r => [names(r.modes, L.MODES) + (r.modeEtc ? ` (${r.modeEtc})` : ''), names(r.days, L.DAYS), names(r.weeks, L.WEEKS)].filter(Boolean).join(' / ');
    const tools = r => names(r.tools, L.TOOLS) + (r.toolEtc ? ` (${r.toolEtc})` : '');

    const csv = list => {
      const cell = v => {
        let s = String(v ?? '');
        if (/^[=+\-@]/.test(s)) s = `'${s}`;   // 엑셀 수식으로 읽히지 않게
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const head = ['연번', '소속', '직급', '성명', '참여 의향', '가능 차수', '평일 방식', '평일 요일', '평일 시기', 'AI 경험', '써 본 도구', '도움받고 싶은 일', '응답일'];
      const lines = list.map((r, i) => [i + 1, r.dept, r.rank, r.name, L.INTENTS[r.intent], L.COHORTS[r.cohort],
        names(r.modes, L.MODES) + (r.modeEtc ? ` (${r.modeEtc})` : ''), names(r.days, L.DAYS), names(r.weeks, L.WEEKS),
        L.EXPS[r.exp], tools(r), r.wish, new Date(r.at).toLocaleString('ko-KR')].map(cell).join(','));
      return '﻿' + [head.join(','), ...lines].join('\r\n');
    };

    // 항목별 몇 명인지. 여러 개 고르는 항목은 배열에서 센다
    const tally = (labels, get) => Object.entries(labels).map(([k, label]) => {
      const n = rows.filter(r => { const v = get(r); return Array.isArray(v) ? v.includes(k) : v === k; }).length;
      return `${esc(label)} <b>${n}</b>`;
    }).join(' · ');

    function draw() {
      const n = rows.length;
      const want = rows.filter(r => r.intent !== 'no');
      const sure = rows.filter(r => r.intent === 'yes').length;
      const can1 = want.filter(r => r.cohort === '1' || r.cohort === 'both').length;
      const can2 = want.filter(r => r.cohort === '2' || r.cohort === 'both').length;
      const weekendNo = want.filter(r => r.cohort === 'none');
      const verdict = want.length > SEATS
        ? `참여 희망 <b>${want.length}명</b>이 차수 정원(${SEATS}명)을 넘습니다 → <b>2차까지 운영</b>을 검토하세요.`
        : `참여 희망 <b>${want.length}명</b>으로 차수 정원(${SEATS}명) 안입니다 → <b>1차만 운영</b>해도 됩니다.`;
      const wishes = rows.filter(r => r.wish).map(r => `<li>${esc(r.wish)} <small>(${esc(r.dept)})</small></li>`).join('');
      view.innerHTML = `
        <p><b>응답 ${n}명</b> / 교직원 ${STAFF}명 (응답률 ${Math.round(n / STAFF * 100)}%)</p>
        <div class="table-wrap"><table><tbody>
          <tr><th>판단</th><td>${verdict}</td></tr>
          <tr><th>참여 의향</th><td>${tally(L.INTENTS, r => r.intent)}</td></tr>
          <tr><th>예정 일정 가능<br><small>(참여 희망자 중)</small></th><td>1차 가능 <b>${can1}</b> · 2차 가능 <b>${can2}</b> · 둘 다 어려움 <b>${weekendNo.length}</b> <small>(꼭 참여 ${sure}명 포함 전체 희망 ${want.length}명 기준)</small></td></tr>
          <tr><th>평일 방식</th><td>${tally(L.MODES, r => r.modes)}<br><small>주말이 둘 다 어려운 희망자 ${weekendNo.length}명 중: ${weekendNo.length ? Object.entries(L.MODES).map(([k, v]) => `${esc(v)} ${weekendNo.filter(r => r.modes.includes(k)).length}`).join(' · ') : '없음'}</small></td></tr>
          <tr><th>평일 요일</th><td>${tally(L.DAYS, r => r.days)}</td></tr>
          <tr><th>평일 시기</th><td>${tally(L.WEEKS, r => r.weeks)}</td></tr>
          <tr><th>AI 사용 경험</th><td>${tally(L.EXPS, r => r.exp)}</td></tr>
          <tr><th>써 본 도구</th><td>${tally(L.TOOLS, r => r.tools)}</td></tr>
        </tbody></table></div>
        ${wishes ? `<details><summary>AI로 도움받고 싶은 일 (${rows.filter(r => r.wish).length}건)</summary><ul>${wishes}</ul></details>` : ''}
        <div class="board-buttons"><button class="btn" type="button" data-admin="csv">응답 내려받기 (CSV)</button></div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>소속</th><th>직급</th><th>성명</th><th>의향</th><th>차수</th><th>평일 가능</th><th>AI 경험</th><th></th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.dept)}</td><td>${esc(r.rank)}</td><td>${esc(r.name)}</td><td>${esc(L.INTENTS[r.intent])}</td><td>${esc(L.COHORTS[r.cohort])}</td><td>${esc(weekday(r))}</td><td>${esc(L.EXPS[r.exp])}</td>
            <td><button class="btn ghost" type="button" data-admin="delete-one" data-id="${esc(r.id)}">삭제</button></td></tr>`).join('') || '<tr><td colspan="9">아직 응답이 없습니다.</td></tr>'}
        </tbody></table></div>`;
    }

    host.addEventListener('click', async event => {
      const btn = event.target.closest('[data-admin]');
      if (!btn) return;
      const action = btn.dataset.admin;
      if (action === 'delete-all-ask') { $(host, '.signup-delete-confirm').hidden = false; return; }
      if (action === 'delete-all-cancel') { $(host, '.signup-delete-confirm').hidden = true; return; }
      if (action === 'csv') {
        const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `수요조사_${new Date().toISOString().slice(0, 10)}.csv` });
        document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        return;
      }
      try { sessionStorage.setItem(ADMIN_KEY, keyInput.value); } catch (_) { /* 저장소 없음 */ }
      status.textContent = '처리하는 중입니다…';
      try {
        if (action === 'delete-one') await call('admin', { key: keyInput.value, action, id: btn.dataset.id });
        if (action === 'delete-all') { await call('admin', { key: keyInput.value, action }); $(host, '.signup-delete-confirm').hidden = true; }
        const data = await call('admin', { key: keyInput.value, action: 'list' });
        rows = data.rows;
        L = data.labels;
        draw();
        status.textContent = { 'delete-one': '한 건을 삭제했습니다.', 'delete-all': '모든 응답을 삭제했습니다.' }[action]
          || `불러왔습니다 (조사 마감 ${new Date(data.close).toLocaleString('ko-KR')}).`;
      } catch (error) {
        status.textContent = error.message;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('survey');
    const admin = document.getElementById('survey-admin');
    if (form) mountForm(form);
    if (admin) mountAdmin(admin);
  });
})();
