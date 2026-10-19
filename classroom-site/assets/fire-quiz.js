(() => {
  'use strict';

  // 오늘의 퀴즈와 결과 공유판 (생성형 AI 활용능력 향상교육).
  // 서버(/api/fire-quiz/…)가 채점하고, 문항별 정답률만 공유판에 보여 줍니다. 개인 점수·순위는 공개하지 않습니다.
  // 화면 구조는 AI 리터러시 강의의 퀴즈(ai-literacy/quiz-ui.js)를 따랐습니다.
  const API = '/api/fire-quiz';
  const NAME_KEY = 'fire-ai-quiz-name';
  const QUIZ = window.FIRE_QUIZ || {};

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* 저장소를 쓸 수 없는 환경 */ } }
  };
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  const LETTERS = ['①', '②', '③', '④'];

  async function call(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}/${path}`, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', ...options });
    } catch (_) {
      throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
    let data = {};
    try { data = await response.json(); } catch (_) { /* 본문이 JSON이 아님 */ }
    if (!response.ok) throw new Error(data.error || `서버에서 문제가 생겼습니다 (${response.status}).`);
    return data;
  }

  function mountQuiz(host, quizId) {
    const quiz = QUIZ[quizId];
    if (!host || !quiz) return;
    const uid = `qz-${quizId}`;
    const orders = quiz.questions.map(item => shuffle(item.options.map((_, i) => i)));

    host.innerHTML = `
      <p class="quiz-kind">오늘의 퀴즈 · ${quiz.questions.length}문항 · 약 4분 · 보기에서 하나 고르기</p>
      <h2 id="${uid}">${esc(quiz.title)}</h2>
      <p class="quiz-lede">수업에서 해 본 것을 확인합니다. 이름이나 별명을 적고 모든 문항에 답한 뒤 제출하세요. <strong>첫 제출만 기록</strong>되고, 개인 점수는 본인에게만 보입니다.</p>
      <div class="quiz-name">
        <label for="${uid}-name">이름 (또는 별명)</label>
        <input id="${uid}-name" type="text" maxlength="20" autocomplete="off" placeholder="예: 홍길동, 불꽃1">
      </div>
      <ol class="quiz-list">
        ${quiz.questions.map((item, qi) => `
          <li class="quiz-item" data-q="${qi}">
            <p class="quiz-q">${esc(item.q)}</p>
            <div class="quiz-options" role="radiogroup" aria-label="${qi + 1}번 문항">
              ${orders[qi].map((optIndex, pos) => `
                <label class="quiz-option">
                  <input type="radio" name="${uid}-${qi}" value="${optIndex}">
                  <span class="mark">${LETTERS[pos]}</span><span>${esc(item.options[optIndex])}</span>
                </label>`).join('')}
            </div>
            <p class="quiz-where" hidden></p>
          </li>`).join('')}
      </ol>
      <div class="quiz-actions">
        <button class="btn" type="button" data-act="submit" disabled>제출하기</button>
        <p class="quiz-status" aria-live="polite">모든 문항에 답하면 제출할 수 있습니다.</p>
      </div>
      <div class="quiz-result" hidden></div>`;

    const nameInput = host.querySelector(`#${uid}-name`);
    const submit = host.querySelector('[data-act="submit"]');
    const status = host.querySelector('.quiz-status');
    const result = host.querySelector('.quiz-result');
    const doneKey = `fire-ai-quiz-done:${quizId}`;
    nameInput.value = store.get(NAME_KEY) || '';

    const chosen = () => quiz.questions.map((_, qi) => {
      const picked = host.querySelector(`input[name="${uid}-${qi}"]:checked`);
      return picked ? Number(picked.value) : null;
    });
    const refresh = () => {
      const left = chosen().filter(a => a === null).length;
      const hasName = nameInput.value.trim().length > 0;
      submit.disabled = left > 0 || !hasName;
      status.textContent = !hasName ? '이름이나 별명을 적어 주세요.' : left ? `${left}문항이 남았습니다.` : '제출할 수 있습니다.';
    };

    function showResult(data, mine) {
      result.hidden = false;
      if (data.already && !mine) {
        result.innerHTML = `<p class="quiz-score warn">“${esc(data.name)}” 이름으로 이미 제출된 기록이 있습니다.</p><p>본인이 낸 기록이 아니라면 이름을 바꿔(예: 이름+숫자) 다시 제출해 주세요.</p>`;
        status.textContent = '';
        nameInput.focus();
        nameInput.select();
        refresh();
        return;
      }
      host.querySelectorAll('input[type="radio"]').forEach(input => { input.disabled = true; });
      host.querySelectorAll('.quiz-item').forEach((li, qi) => {
        const ok = data.correct[qi];
        li.classList.add(ok ? 'is-right' : 'is-wrong');
        const where = li.querySelector('.quiz-where');
        if (!ok && data.review[qi]) { where.hidden = false; where.textContent = `다시 볼 곳: ${data.review[qi]}`; }
      });
      submit.hidden = true;
      nameInput.disabled = true;
      result.innerHTML = `<p class="quiz-score">${esc(data.name)} 님 · <strong>${data.score} / ${data.total}</strong>${data.already ? ' (이미 제출한 기록)' : ''}</p><p>틀린 문항 아래에 다시 볼 곳을 표시했습니다. 모두의 정답률은 <a href="#board">결과 공유판</a>에서 함께 봅니다.</p>`;
      status.textContent = '';
    }

    host.addEventListener('change', refresh);
    nameInput.addEventListener('input', refresh);
    submit.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      store.set(NAME_KEY, name);
      submit.disabled = true;
      status.textContent = '제출하는 중입니다…';
      try {
        const data = await call('submit', { method: 'POST', body: JSON.stringify({ quiz: quizId, name, answers: chosen() }) });
        const mine = store.get(doneKey) === name.toLocaleLowerCase('ko');
        if (!data.already) store.set(doneKey, name.toLocaleLowerCase('ko'));
        showResult(data, !data.already || mine);
      } catch (error) {
        status.textContent = error.message;
        refresh();
      }
    });
    refresh();
  }

  function mountBoard(host) {
    if (!host) return;
    const open = new Set();
    host.innerHTML = `
      <p class="quiz-lede">오늘의 퀴즈 제출 인원과 문항별 정답률입니다. 몇 초마다 저절로 새로 고쳐집니다. 개인 점수와 순위는 보이지 않습니다.</p>
      <p class="board-updated" aria-live="polite">불러오는 중입니다…</p>
      <div class="board-rates"></div>
      <details class="board-admin">
        <summary>관리 (강의 진행용)</summary>
        <div class="board-admin-body">
          <label for="board-key">관리 비밀번호</label>
          <input id="board-key" type="password" autocomplete="off">
          <div class="board-buttons">
            <button class="btn" type="button" data-admin="show-answers">정답 표시</button>
            <button class="btn ghost" type="button" data-admin="hide-answers">정답 숨기기</button>
            <button class="btn ghost" type="button" data-admin="reset-ask">결과 모두 지우기…</button>
            <span class="board-reset-confirm" hidden>정말 모든 제출 기록을 지울까요? <button class="btn" type="button" data-admin="reset">네, 지웁니다</button> <button class="btn ghost" type="button" data-admin="reset-cancel">취소</button></span>
          </div>
          <p class="board-admin-status" aria-live="polite"></p>
        </div>
      </details>`;

    const updated = host.querySelector('.board-updated');
    const adminStatus = host.querySelector('.board-admin-status');
    const keyInput = host.querySelector('#board-key');
    try { keyInput.value = sessionStorage.getItem('fire-ai-quiz-admin') || ''; } catch (_) { /* 저장소 없음 */ }

    function draw(data) {
      host.querySelector('.board-rates').innerHTML = data.quizIds.filter(id => QUIZ[id]).map(id => {
        const quiz = QUIZ[id];
        const qs = data.quizzes[id].questions;
        const rated = qs.map(q => q.correctRate).filter(r => r !== null);
        const worst = rated.length ? Math.min(...rated) : null;
        return `<div class="rate-group"><h3>${esc(quiz.title)} <small>${data.quizzes[id].submitted}명 제출</small></h3>
          ${qs.map((q, qi) => {
            const key = `${id}-${qi}`;
            const total = q.counts.reduce((a, b) => a + b, 0);
            const rate = q.correctRate;
            return `<div class="rate-row ${rate !== null && rate === worst && rated.length > 1 && worst < 100 ? 'worst' : ''}">
              <button type="button" class="rate-q" data-key="${key}" aria-expanded="${open.has(key)}">
                <span>Q${qi + 1}. ${esc(quiz.questions[qi].q)}</span>
                <span class="rate-bar" aria-hidden="true"><span style="width:${rate || 0}%"></span></span>
                <strong>${rate === null ? '–' : `${rate}%`}</strong>
              </button>
              <ul class="rate-options" ${open.has(key) ? '' : 'hidden'}>
                ${quiz.questions[qi].options.map((opt, oi) => `<li class="${q.answer === oi ? 'is-answer' : ''}"><span>${esc(opt)}${q.answer === oi ? ' ✓ 정답' : ''}</span><span>${q.counts[oi]}명${total ? ` (${Math.round((q.counts[oi] / total) * 100)}%)` : ''}</span></li>`).join('')}
                ${q.answer === null ? '<li class="muted-line">정답은 진행자가 "정답 표시"를 누르면 보입니다.</li>' : ''}
              </ul>
            </div>`;
          }).join('')}</div>`;
      }).join('');
      updated.textContent = `${new Date(data.updatedAt).toLocaleTimeString('ko-KR')} 기준 · 문항을 누르면 어떤 답을 많이 골랐는지 볼 수 있습니다. 가장 많이 틀린 문항은 빨간색으로 표시됩니다.`;
    }

    let timer = null;
    async function load() {
      try { draw(await call('board')); } catch (error) { updated.textContent = error.message; }
      timer = setTimeout(load, 5000);
    }

    host.addEventListener('click', async event => {
      const q = event.target.closest('.rate-q');
      if (q) {
        const key = q.dataset.key;
        if (open.has(key)) open.delete(key); else open.add(key);
        q.setAttribute('aria-expanded', String(open.has(key)));
        q.nextElementSibling.hidden = !open.has(key);
        return;
      }
      const btn = event.target.closest('[data-admin]');
      if (!btn) return;
      const action = btn.dataset.admin;
      const confirmBox = host.querySelector('.board-reset-confirm');
      if (action === 'reset-ask') { confirmBox.hidden = false; return; }
      if (action === 'reset-cancel') { confirmBox.hidden = true; return; }
      try { sessionStorage.setItem('fire-ai-quiz-admin', keyInput.value); } catch (_) { /* 저장소 없음 */ }
      adminStatus.textContent = '처리하는 중입니다…';
      try {
        await call('admin', { method: 'POST', body: JSON.stringify({ key: keyInput.value, action }) });
        confirmBox.hidden = true;
        adminStatus.textContent = { 'show-answers': '정답을 표시했습니다.', 'hide-answers': '정답을 숨겼습니다.', reset: '모든 제출 기록을 지웠습니다.' }[action];
        clearTimeout(timer);
        load();
      } catch (error) {
        adminStatus.textContent = error.message;
      }
    });

    load();
  }

  document.querySelectorAll('[data-quiz]').forEach(el => mountQuiz(el, el.dataset.quiz));
  mountBoard(document.querySelector('[data-board]'));
})();
