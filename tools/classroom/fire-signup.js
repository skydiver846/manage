(() => {
  'use strict';

  // 교육 신청 (생성형 AI 활용능력 향상교육).
  // 서버(/api/fire-signup/…)에 저장하고, 강사는 관리 비밀번호로 신청 현황을 봅니다.
  const API = '/api/fire-signup';
  const ADMIN_KEY = 'fire-ai-quiz-admin';   // 오늘의 퀴즈와 같은 관리 비밀번호
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const $ = (root, sel) => root.querySelector(sel);

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

  // ── 신청서 ──
  function mountForm(host) {
    const form = $(host, 'form');
    const status = $(host, '.signup-status');
    const done = $(host, '.signup-done');
    const email = form.elements.email;
    const hint = $(host, '.signup-email-hint');

    email.addEventListener('input', () => {
      const v = email.value.trim().toLowerCase();
      hint.hidden = !v.includes('@') || v.endsWith('@gmail.com');
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const f = form.elements;
      const body = {
        name: f.name.value, dept: f.dept.value, rank: f.rank.value,
        cohort: f.cohort.value, exp: f.exp.value, email: f.email.value,
        agreePrivacy: f.agreePrivacy.checked, agreeTeam: f.agreeTeam.checked
      };
      const button = $(form, 'button[type="submit"]');
      button.disabled = true;
      status.textContent = '신청하는 중입니다…';
      try {
        const data = await call('submit', body);
        status.textContent = '';
        form.hidden = true;
        done.hidden = false;
        $(done, '.signup-done-title').textContent = data.updated
          ? `${data.name}님, 신청 내용을 고쳤습니다 (${data.cohort}).`
          : `${data.name}님, 신청되었습니다 (${data.cohort}).`;
        $(done, '.signup-done-email').textContent = data.email;
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

  // ── 내 신청 확인·취소 ──
  function mountLookup(host) {
    const out = $(host, '.lookup-out');
    host.addEventListener('click', async event => {
      const btn = event.target.closest('[data-lookup]');
      if (!btn) return;
      const action = btn.dataset.lookup;
      if (action === 'cancel-ask') { $(host, '.lookup-confirm').hidden = false; return; }
      if (action === 'cancel-no') { $(host, '.lookup-confirm').hidden = true; return; }
      const email = $(host, '#lookup-email').value, name = $(host, '#lookup-name').value;
      out.textContent = '확인하는 중입니다…';
      try {
        const data = await call('lookup', { email, name, action: action === 'cancel' ? 'cancel' : 'check' });
        $(host, '.lookup-confirm').hidden = true;
        out.textContent = data.cancelled
          ? '신청을 취소했습니다.'
          : `${data.name} · ${data.dept} · ${data.rank} · 희망 ${data.cohort} · AI 사용 경험 ${data.exp} (신청일 ${new Date(data.at).toLocaleDateString('ko-KR')})`;
      } catch (error) {
        out.textContent = error.message;
      }
    });
  }

  // ── 강사용 신청 현황 ──
  function mountAdmin(host) {
    const keyInput = $(host, '#signup-key');
    const status = $(host, '.signup-admin-status');
    const view = $(host, '.signup-admin-view');
    let rows = [];
    try { keyInput.value = sessionStorage.getItem(ADMIN_KEY) || ''; } catch (_) { /* 저장소 없음 */ }

    const csv = list => {
      const cell = v => {
        let s = String(v ?? '');
        if (/^[=+\-@]/.test(s)) s = `'${s}`;   // 엑셀 수식으로 읽히지 않게
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const head = ['연번', '소속', '직급', '성명', '희망 차수', 'AI 사용 경험', '구글 계정', '신청일'];
      const lines = list.map((r, i) => [i + 1, r.dept, r.rank, r.name, r.cohortLabel, r.expLabel, r.email, new Date(r.at).toLocaleString('ko-KR')].map(cell).join(','));
      return '﻿' + [head.join(','), ...lines].join('\r\n');
    };

    function draw() {
      const count = c => rows.filter(r => r.cohort === c).length;
      const expCount = e => rows.filter(r => r.exp === e).length;
      view.innerHTML = `
        <p><b>신청 ${rows.length}명</b> · 1차 ${count('1')} · 2차 ${count('2')} · 어느 차수든 ${count('any')}
          &nbsp;|&nbsp; AI 사용 경험: 없음 ${expCount('none')} · 몇 번 ${expCount('few')} · 가끔 ${expCount('some')} · 자주 ${expCount('often')}</p>
        <div class="board-buttons">
          <button class="btn" type="button" data-admin="csv">목록 내려받기 (CSV)</button>
          <button class="btn ghost" type="button" data-admin="copy" data-c="1">1차 이메일 복사</button>
          <button class="btn ghost" type="button" data-admin="copy" data-c="2">2차 이메일 복사</button>
          <button class="btn ghost" type="button" data-admin="copy" data-c="any">어느 차수든 이메일 복사</button>
        </div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>소속</th><th>직급</th><th>성명</th><th>희망</th><th>AI 경험</th><th>구글 계정</th><th></th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.dept)}</td><td>${esc(r.rank)}</td><td>${esc(r.name)}</td><td>${esc(r.cohortLabel)}</td><td>${esc(r.expLabel)}</td><td>${esc(r.email)}</td>
            <td><button class="btn ghost" type="button" data-admin="delete-one" data-email="${esc(r.email)}">삭제</button></td></tr>`).join('') || '<tr><td colspan="8">아직 신청이 없습니다.</td></tr>'}
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
        const a = Object.assign(document.createElement('a'), { href: url, download: `교육신청_${new Date().toISOString().slice(0, 10)}.csv` });
        document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        return;
      }
      if (action === 'copy') {
        const list = rows.filter(r => r.cohort === btn.dataset.c).map(r => r.email).join(', ');
        try { await navigator.clipboard.writeText(list); status.textContent = list ? '이메일을 복사했습니다. Team 멤버 초대 칸에 붙여넣으세요.' : '복사할 이메일이 없습니다.'; }
        catch (_) { status.textContent = list; }
        return;
      }
      try { sessionStorage.setItem(ADMIN_KEY, keyInput.value); } catch (_) { /* 저장소 없음 */ }
      status.textContent = '처리하는 중입니다…';
      try {
        if (action === 'delete-one') await call('admin', { key: keyInput.value, action, email: btn.dataset.email });
        if (action === 'delete-all') { await call('admin', { key: keyInput.value, action }); $(host, '.signup-delete-confirm').hidden = true; }
        const data = await call('admin', { key: keyInput.value, action: 'list' });
        rows = data.rows;
        draw();
        status.textContent = { 'delete-one': '한 건을 삭제했습니다.', 'delete-all': '모든 신청 기록을 삭제했습니다.' }[action]
          || `불러왔습니다 (신청 마감 ${new Date(data.close).toLocaleString('ko-KR')}).`;
      } catch (error) {
        status.textContent = error.message;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signup');
    const lookup = document.getElementById('signup-lookup');
    const admin = document.getElementById('signup-admin');
    if (form) mountForm(form);
    if (lookup) mountLookup(lookup);
    if (admin) mountAdmin(admin);
  });
})();
