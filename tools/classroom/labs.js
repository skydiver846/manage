(() => {
  'use strict';

  // 강의 본문 속 "바로 해 보기" 작은 실습. 본문에 <div class="lab" data-lab="종류" ...></div> 를 두면 이 파일이 채운다.
  // 모두 이 브라우저 안에서만 돌아가며, 가입이나 전송이 없다.
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  function shell(host, { time, title, goal, howTo }) {
    host.innerHTML = `<section class="inline-lab">
      <p class="lab-kind"><span>바로 해 보기</span>${esc(time)}</p>
      <h3 class="lab-title">${esc(title)}</h3>
      <p class="lab-goal">${goal}</p>
      ${howTo && howTo.length ? `<div class="how-to"><p class="how-to-title">이렇게 진행하세요</p><ol>${howTo.map(s => `<li>${s}</li>`).join('')}</ol></div>` : ''}
      <div class="lab-body"></div></section>`;
    return host.querySelector('.lab-body');
  }

  /* ───────── 09: 준비물 화면 단계별로 눌러 보기 ───────── */
  const STEPS = [
    { file: 'steps/1-html.html', label: '1단계 · HTML만',
      observe: '<b>[추가]</b>를 누르고 목록의 체크 상자도 눌러 보세요. 가족별 표의 숫자는 <b>그대로</b>입니다. HTML은 무엇이 있는지만 정하는 <b>뼈대</b>라서 움직일 근육이 없습니다. 표의 33%도 사람이 미리 적어 둔 글자입니다.' },
    { file: 'steps/2-css.html', label: '2단계 · CSS 입히기',
      observe: '1단계와 <b>내용은 똑같은데 모양</b>만 달라졌습니다. HTML은 그대로 두고 CSS(옷)만 더했습니다. [추가]는 여전히 반응이 없습니다. 위 단계 버튼으로 1단계와 번갈아 보세요.' },
    { file: 'steps/3-js.html', label: '3단계 · JavaScript 더하기',
      observe: '준비물 <code>멀미약</code>·<code>여벌 옷</code>·<code>체험학습 보고서</code>를 누구 것 <b>아이</b>로 추가하고 하나만 체크하세요. 아이 줄이 <b>3개 중 1개, 33%, "서둘러요"</b>로 저절로 바뀝니다. 처음으로 화면이 <b>계산</b>을 했습니다.' },
    { file: 'prototype/index.html', label: '4단계 · 완성본',
      observe: '처음 열면 "(예시)" 준비물이 보이고, 정렬·요약 숫자·취소·내려받기가 더해졌습니다. 몇 개 체크한 뒤 <b>[새로고침]</b>을 눌러 보세요. 3단계와 달리 <b>그대로 남아 있습니다</b>. 이 브라우저의 저장소(localStorage)에 기억해 두기 때문입니다.' }
  ];

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} (${response.status})`);
    return response.text();
  }

  function stepsLab(host) {
    const only = host.dataset.step ? Number(host.dataset.step) - 1 : null;   // data-step="3" 이면 그 단계만
    const steps = only === null ? STEPS.map((s, i) => i) : (only === 1 ? [0, 1] : [only]);
    const titles = ['HTML만 있는 화면', '같은 화면에 CSS 입히기', 'JavaScript가 계산하는 화면', '기억하는 완성본'];
    const times = ['약 2분', '약 2분', '약 5분', '약 3분'];
    const body = shell(host, {
      time: only === null ? '약 10분' : times[only],
      title: only === null ? '준비물 화면, 단계별로 눌러 보기' : `준비물 화면 ${only + 1}단계 · ${titles[only]}`,
      goal: '실습 파일을 내려받지 않고, 이 페이지 안에서 바로 눌러 봅니다. 아래 화면은 실제 실습 파일 그대로입니다.',
      howTo: only === 2 ? [
        '아래 화면에서 준비물 3개를 <b>아이</b> 것으로 추가하고 하나만 체크합니다.',
        '<b>기준 바꿔 보기</b>에 <code>30</code>을 넣고 [적용] → 같은 준비물을 다시 넣고 하나만 체크하면, 같은 33%인데 이번엔 <b>"순조로움"</b>입니다. 코드에서는 <code>rate &lt; 50</code> 한 곳만 바뀌었습니다.',
        '준비물을 넣은 뒤 <b>[새로고침]</b>을 누릅니다. 목록과 표가 <b>사라집니다</b>. 기억해 둘 곳이 없기 때문입니다.'
      ] : null
    });
    body.innerHTML = `
      ${steps.length > 1 ? `<div class="lab-steps" role="tablist">${steps.map(i => `<button type="button" role="tab" data-i="${i}">${STEPS[i].label}</button>`).join('')}</div>` : ''}
      <p class="lab-observe"></p>
      ${only === 2 ? `<div class="lab-tweak"><label>기준 바꿔 보기: 챙김률 <input type="number" min="1" max="100" value="50" inputmode="numeric"> % 미만이면 서둘러요</label> <button type="button" class="btn" data-act="tweak">적용</button> <small class="lab-tweak-out"></small></div>` : ''}
      <div class="lab-frame"><iframe title="실습 화면" loading="lazy"></iframe></div>
      <div class="lab-actions">
        <button type="button" class="btn ghost" data-act="reload">새로고침 (F5와 같음)</button>
        <a class="btn ghost" data-act="open" target="_blank" rel="noopener">새 창으로 열기</a>
      </div>
      <details class="lab-code"><summary>이 단계의 코드 보기</summary><pre></pre></details>`;
    const frame = body.querySelector('iframe');
    const pre = body.querySelector('.lab-code pre');
    let cur = 0;
    let srcdoc = null;

    async function show(i) {
      cur = i; srcdoc = null;
      body.querySelectorAll('[data-i]').forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.i) === i)));
      body.querySelector('.lab-observe').innerHTML = `<b>살펴보기</b> ${STEPS[i].observe}`;
      body.querySelector('[data-act="open"]').href = STEPS[i].file;
      frame.removeAttribute('srcdoc');
      frame.src = STEPS[i].file;
      pre.textContent = '불러오는 중…';
      try { pre.textContent = await fetchText(STEPS[i].file); } catch (e) { pre.textContent = `코드를 불러오지 못했습니다: ${e.message}`; }
    }

    body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => show(Number(b.dataset.i))));
    body.querySelector('[data-act="reload"]').addEventListener('click', () => {
      if (srcdoc) { frame.srcdoc = srcdoc; return; }
      frame.src = STEPS[cur].file;
    });
    const tweak = body.querySelector('[data-act="tweak"]');
    if (tweak) tweak.addEventListener('click', async () => {
      const out = body.querySelector('.lab-tweak-out');
      const n = Math.min(100, Math.max(1, Math.round(Number(body.querySelector('.lab-tweak input').value) || 50)));
      try {
        const src = await fetchText(STEPS[2].file);
        if (!/return rate < 50;/.test(src)) throw new Error('기준 줄을 찾지 못했습니다');
        srcdoc = src.replace('return rate < 50;', `return rate < ${n};`).replace('챙김률 50% 미만은 서둘러요', `챙김률 ${n}% 미만은 서둘러요`);
        frame.srcdoc = srcdoc;
        pre.textContent = srcdoc;
        out.innerHTML = `코드 한 줄이 <code>return rate &lt; ${n};</code> 으로 바뀌었습니다. 준비물을 다시 넣어 보세요.`;
      } catch (e) { out.textContent = `바꾸지 못했습니다: ${e.message}`; }
    });
    show(only === null ? 0 : only);
  }

  /* ───────── 10-6: 각자 수첩 vs 공용 장부 ───────── */
  const ITEMS = [['멀미약', '아이'], ['여벌 옷', '아이'], ['혈압약', '할머니'], ['무릎 보호대', '할머니'], ['우산', '가족 전체']];

  function ledgerLab(host) {
    const body = shell(host, {
      time: '약 3분',
      title: '각자 수첩 vs 공용 장부',
      goal: '내 휴대폰과 배우자 휴대폰에 같은 준비물 화면이 열려 있습니다. 한쪽에서 체크하면 다른 쪽에도 보일까요?',
      howTo: [
        '<b>각자 수첩</b>이 골라진 상태에서 <b>배우자 휴대폰</b>의 멀미약·혈압약을 체크합니다. <b>내 휴대폰</b>은 어떤가요?',
        '위에서 <b>공용 장부(데이터베이스)</b>를 고릅니다.',
        '다시 배우자 휴대폰에서 체크해 봅니다. 이번엔 <b>두 휴대폰이 함께</b> 바뀌고, 가운데 장부에 기록이 쌓입니다.'
      ]
    });
    body.innerHTML = `
      <div class="lab-steps" role="tablist">
        <button type="button" role="tab" data-mode="local" aria-selected="true">각자 수첩 (지금 화면)</button>
        <button type="button" role="tab" data-mode="db" aria-selected="false">공용 장부 (데이터베이스)</button>
      </div>
      <p class="lab-observe"></p>
      <div class="ledger">
        <div class="phone" data-who="0"><p class="phone-name">📱 내 휴대폰</p><ul></ul><p class="phone-rate"></p><p class="phone-store"></p></div>
        <div class="ledger-db" hidden><p class="phone-name">🗄️ 공용 장부</p><ol></ol></div>
        <div class="phone" data-who="1"><p class="phone-name">📱 배우자 휴대폰</p><ul></ul><p class="phone-rate"></p><p class="phone-store"></p></div>
      </div>
      <div class="lab-actions"><button type="button" class="btn ghost" data-act="reset">처음부터 다시</button></div>
      <ul class="lab-missions"></ul>`;
    let mode = 'local';
    const notes = { local: [ITEMS.map(() => false), ITEMS.map(() => false)], db: ITEMS.map(() => false) };
    const log = [];
    const seen = { split: false, shared: false };

    const state = who => (mode === 'db' ? notes.db : notes.local[who]);
    function draw() {
      body.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
      body.querySelector('.lab-observe').innerHTML = mode === 'local'
        ? '<b>살펴보기</b> 지금 준비물 화면과 같습니다. 체크 기록은 <b>각 휴대폰 브라우저의 개인 수첩(localStorage)</b>에만 적힙니다.'
        : '<b>살펴보기</b> 두 휴대폰이 <b>같은 장부</b>를 읽고 씁니다. 누가 체크하든 장부에 한 번 적히고, 모두가 그 장부를 봅니다. 아래 네 칸 표의 <b>②</b>입니다.';
      body.querySelector('.ledger-db').hidden = mode !== 'db';
      body.querySelectorAll('.phone').forEach(ph => {
        const who = Number(ph.dataset.who), st = state(who);
        ph.querySelector('ul').innerHTML = ITEMS.map(([name, owner], i) =>
          `<li><label><input type="checkbox" data-i="${i}"${st[i] ? ' checked' : ''}> ${esc(name)} <small>· ${esc(owner)}</small></label></li>`).join('');
        const done = st.filter(Boolean).length;
        ph.querySelector('.phone-rate').innerHTML = `챙김 <b>${done} / ${ITEMS.length}</b> (${Math.round(done / ITEMS.length * 100)}%)`;
        ph.querySelector('.phone-store').textContent = mode === 'db' ? '기록 위치: 공용 장부' : '기록 위치: 이 휴대폰 수첩';
      });
      body.querySelector('.ledger-db ol').innerHTML = log.length
        ? log.slice(-6).map(t => `<li>${t}</li>`).join('')
        : '<li class="muted">아직 기록이 없습니다</li>';
      const a = notes.local[0].join(), b = notes.local[1].join();
      if (mode === 'local' && a !== b) seen.split = true;
      if (mode === 'db' && log.length) seen.shared = true;
      body.querySelector('.lab-missions').innerHTML = [
        [seen.split, '각자 수첩: 배우자가 체크한 것이 <b>내 휴대폰에는 안 보이는</b> 것을 확인'],
        [seen.shared, '공용 장부: 한쪽에서 체크하면 <b>두 휴대폰이 함께</b> 바뀌는 것을 확인']
      ].map(([ok, t]) => `<li class="${ok ? 'done' : ''}">${ok ? '✅' : '⬜'} ${t}</li>`).join('');
    }
    body.addEventListener('change', e => {
      const box = e.target.closest('input[data-i]');
      if (!box) return;
      const who = Number(box.closest('.phone').dataset.who), i = Number(box.dataset.i);
      state(who)[i] = box.checked;
      if (mode === 'db') log.push(`${who ? '배우자' : '나'}: ${esc(ITEMS[i][0])} ${box.checked ? '챙김' : '취소'}`);
      draw();
    });
    body.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
    body.querySelector('[data-act="reset"]').addEventListener('click', () => {
      notes.local = [ITEMS.map(() => false), ITEMS.map(() => false)]; notes.db = ITEMS.map(() => false);
      log.length = 0; seen.split = seen.shared = false; mode = 'local'; draw();
    });
    draw();
  }

  /* ───────── 03-1: 막연한 요청 다듬기 (프롬프트 5요소) ───────── */
  // 낱말로 대략 찾는다. 정답 채점이 아니라 "빠진 요소가 있는지" 스스로 돌아보게 하는 거울이다.
  const ELEMENTS = [
    { key: '역할', re: /너는|역할|로서|처럼\s*(답|써|생각)|전문가|도우미|담당자/g, hint: '누구처럼 답할까? 예) "너는 가족 여행을 꼼꼼히 챙기는 여행 도우미야"' },
    { key: '목표', re: /목표|안내문?|일정표|계획표|공문|보고서|요약|(써|만들어|짜|정리해|알려)\s*줘/g, hint: '무엇을 원하나? 예) "가족 단톡방에 올릴 일정 안내를 써 줘"' },
    { key: '맥락', re: /맥락|배경|할머니|아이|초등|가족\s*\d|\d+\s*명|무릎|광주|자가용|가을|주말|금[~～\-]일|숙소|대상|기간|일시/g, hint: '배경은? 예) "가족 4명, 할머니 75세 무릎 불편, 아이 초3, 광주에서 자가용"' },
    { key: '형식', re: /형식|표로?|목록|글머리|\d+\s*줄|문단|인사|제목|항목/g, hint: '어떤 모양으로? 예) "인사 1줄 + 날짜별 일정 표(시간·장소·이동·메모)"' },
    { key: '조건', re: /조건|이내|이하|넘지|하지\s*마|빼고|\[?확인\s*필요\]?|짧게|쉽게|쉬엄쉬엄|\d+\s*곳|반말|존댓말|휴대폰에서/g, hint: '지킬 것은? 예) "하루 2곳 이내, 모르는 요금은 [확인 필요]로"' }
  ];
  const PROMPT_TASKS = [
    { label: '여행', vague: '경주 여행 일정 짜 줘',
      model: '[역할] 너는 가족 여행을 꼼꼼히 챙기는 여행 도우미야.\n[목표] 가족 단톡방에 올릴 경주 2박 3일 일정 안내를 써 줘.\n[맥락] 가을 주말(금~일), 광주에서 자가용으로 약 3시간. 가족 4명: 나, 배우자, 아이(초등 3학년),\n       할머니(75세, 무릎이 불편해 오래 걷기·계단이 어려움). 숙소는 보문단지 근처.\n[형식] 인사 1줄, 날짜별 일정은 표(시간·장소·이동·메모), 끝에 꼭 챙길 것 3가지.\n[조건] 휴대폰에서 읽기 쉽게 짧게, 하루 2곳 정도로 쉬엄쉬엄. 입장료·운영시간처럼 확인되지 않은 내용은 [확인 필요]로 표시.' },
    { label: '업무', vague: '교육 안내문 써 줘',
      model: '[역할] 너는 소방학교 교육 운영 담당자야.\n[목표] 직원들에게 보낼 「생성형 AI 활용능력 향상교육」 참여 안내문을 써 줘.\n[맥락] 대상은 전 직원 희망자 20명 내외, 일시 11. 6.(금) 16~21시·11. 7.(토) 08~13시, 장소 교육훈련관 2층 정보화교육장.\n       AI를 처음 써도 참여할 수 있고, 수업 전에 구글 계정을 만들어 와야 함.\n[형식] 제목 1줄, 인사 2줄, 핵심 안내 4항목(글머리표), 끝에 문의처 한 줄.\n[조건] 메신저로 보내기 좋게 10줄 이내, 존댓말, 날짜·장소 등 모르는 내용은 [확인 필요]로 표시.' }
  ];

  function promptLab(host) {
    const body = shell(host, {
      time: '약 3분',
      title: '막연한 요청 다듬기',
      goal: '한 줄짜리 막연한 요청을 5요소(역할·목표·맥락·형식·조건)를 넣어 다시 써 봅니다. 쓴 글에서 요소가 보이면 초록색으로 표시됩니다.',
      howTo: [
        '<b>여행</b> 또는 <b>업무</b> 버튼을 고르고, 회색 상자의 막연한 요청을 읽습니다.',
        '아래 칸에 5요소를 넣어 다시 씁니다. <code>[역할]</code> 같은 머리말을 붙이면 쉽습니다.',
        '<b>[5요소 확인]</b> → 빠진 요소의 힌트를 보고 보탭니다. 마지막에 <b>[좋은 예와 비교]</b>로 견줘 봅니다.'
      ]
    });
    body.innerHTML = `
      <div class="lab-steps" role="tablist">${PROMPT_TASKS.map((t, i) => `<button type="button" role="tab" data-t="${i}">${t.label}</button>`).join('')}</div>
      <p class="prompt-vague"></p>
      <label class="sr-only" for="${'pl-' + Math.random().toString(36).slice(2, 7)}">다듬은 요청</label>
      <textarea class="prompt-input" rows="6" placeholder="[역할] 너는 …&#10;[목표] …&#10;[맥락] …&#10;[형식] …&#10;[조건] …"></textarea>
      <div class="lab-actions">
        <button type="button" class="btn" data-act="check">5요소 확인</button>
        <button type="button" class="btn ghost" data-act="model">좋은 예와 비교</button>
        <button type="button" class="btn ghost" data-act="copy">내 요청 복사</button>
      </div>
      <ul class="prompt-score"></ul>
      <div class="prompt-mark" hidden></div>
      <details class="prompt-model" hidden><summary>좋은 예</summary><pre></pre></details>
      <p class="prompt-status" aria-live="polite"></p>`;
    const input = body.querySelector('.prompt-input');
    input.id = body.querySelector('label.sr-only').htmlFor;
    let t = 0;

    function pick(i) {
      t = i;
      body.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.t) === i)));
      body.querySelector('.prompt-vague').innerHTML = `<b>막연한 요청</b> <code>${esc(PROMPT_TASKS[i].vague)}</code> → AI는 누구를 위해, 어떤 모양으로, 무엇을 지켜야 하는지 모릅니다.`;
      input.value = '';
      body.querySelector('.prompt-score').innerHTML = '';
      body.querySelector('.prompt-mark').hidden = true;
      const model = body.querySelector('.prompt-model');
      model.hidden = true; model.open = false;
      model.querySelector('pre').textContent = PROMPT_TASKS[i].model;
      body.querySelector('.prompt-status').textContent = '';
    }

    function check() {
      const text = input.value.trim();
      const status = body.querySelector('.prompt-status');
      if (!text) { status.textContent = '먼저 아래 칸에 다듬은 요청을 써 주세요.'; return; }
      status.textContent = '';
      let found = 0;
      const ranges = [];
      body.querySelector('.prompt-score').innerHTML = ELEMENTS.map(el => {
        const hits = [...text.matchAll(el.re)];
        hits.forEach(m => ranges.push([m.index, m.index + m[0].length]));
        if (hits.length) found += 1;
        return hits.length
          ? `<li class="done">✅ <b>${el.key}</b> <small>${esc(hits.slice(0, 3).map(m => m[0]).join(', '))}</small></li>`
          : `<li>⬜ <b>${el.key}</b> <small>${esc(el.hint)}</small></li>`;
      }).join('') + `<li class="prompt-total"><b>${found} / 5</b> ${found === 5 ? '모두 들어갔습니다. 이제 Claude에 붙여넣어 결과를 비교해 보세요.' : '빠진 요소를 보태 보세요.'}</li>`;
      // 찾은 낱말에 초록 표시
      ranges.sort((a, b) => a[0] - b[0]);
      let html = '', pos = 0;
      for (const [a, b] of ranges) { if (a < pos) continue; html += esc(text.slice(pos, a)) + `<mark>${esc(text.slice(a, b))}</mark>`; pos = b; }
      html += esc(text.slice(pos));
      const mark = body.querySelector('.prompt-mark');
      mark.innerHTML = html; mark.hidden = false;
    }

    body.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.t))));
    body.querySelector('[data-act="check"]').addEventListener('click', check);
    body.querySelector('[data-act="model"]').addEventListener('click', () => {
      const model = body.querySelector('.prompt-model'); model.hidden = false; model.open = true;
    });
    body.querySelector('[data-act="copy"]').addEventListener('click', async () => {
      const status = body.querySelector('.prompt-status');
      try { await navigator.clipboard.writeText(input.value); status.textContent = '복사했습니다. Claude 새 채팅에 붙여넣어 보세요.'; }
      catch (_) { input.select(); status.textContent = '글이 선택되었습니다. Ctrl + C 로 복사하세요.'; }
    });
    pick(0);
  }

  /* ───────── 08: AI에게 맡길 일 나누기 ───────── */
  const BINS = { ai: '🤖 맡긴다', ok: '🤝 확인·승인', me: '🙋 직접' };
  const BIN_LONG = { ai: '🤖 맡긴다 = AI에게 맡긴다', ok: '🤝 확인·승인 = AI가 준비하고 사람이 확인·승인', me: '🙋 직접 = 사람이 직접 (AI 쓰지 않음)' };
  const TASKS = [
    { t: '경주 숙소 빈방과 가격을 비교해 표로 만들기', tag: '여행', ok: ['ai'], why: '공개 정보 찾기·정리는 틀려도 되돌릴 수 있습니다. 표의 가격은 예약 전에 실제 화면과 대조합니다.' },
    { t: '고른 숙소를 예약하고 카드로 결제하기', tag: '여행', ok: ['me', 'ok'], why: '결제·예약은 되돌리기 어렵습니다. AI가 빈방을 찾아 둬도 카드 번호와 마지막 [결제] 버튼은 사람이 누릅니다.' },
    { t: '가족 단톡방에 여행 일정 안내 보내기', tag: '여행', ok: ['ok'], why: '글은 AI가 써도 좋지만, 메시지 보내기는 사람이 읽고 확인한 뒤 보냅니다.' },
    { t: '출발 3일 전부터 매일 아침 경주 날씨 확인하기', tag: '여행', ok: ['ai'], why: '공개 사이트를 반복해서 보는 일은 루틴으로 맡기기 좋습니다(8-4).' },
    { t: '기관 누리집의 새 공지를 확인해 세 줄로 요약하기', tag: '업무', ok: ['ai'], why: '공개 정보 확인은 처음 맡기기 좋은 일입니다. 요약이 원문과 맞는지만 확인합니다.' },
    { t: '내부 업무 시스템에 로그인해 직원·민원 정보 조회하기', tag: '업무', ok: ['me'], why: '개인정보가 있는 내부 시스템은 기본적으로 AI 브라우저를 쓰지 않습니다. 기관 규정이 우선입니다.' },
    { t: '공문 기안을 결재에 올리기', tag: '업무', ok: ['me', 'ok'], why: '게시·제출·결재는 사람이 하거나 최소한 사람이 승인합니다. 초안 작성까지가 AI의 몫입니다.' },
    { t: '내가 만든 준비물 화면의 버튼이 잘 되는지 점검하기', tag: '업무', ok: ['ai'], why: '내가 만든 도구 점검은 틀려도 되돌릴 수 있는 일이라 맡기기 좋습니다(8-2). 보고와 실제 화면은 대조합니다.' }
  ];

  function delegateLab(host) {
    const body = shell(host, {
      time: '약 3분',
      title: 'AI에게 맡길 일 나누기',
      goal: '여행과 업무에서 나온 일 8가지를 위 기준표에 비추어 세 칸으로 나눠 봅니다.',
      howTo: [
        '일마다 <b>🤖 맡긴다 · 🤝 확인·승인 · 🙋 직접</b> 중 하나를 누릅니다.',
        '모두 고르면 <b>[확인하기]</b>를 누르고, 일마다 나온 이유를 읽습니다.',
        '헷갈리면 질문 하나만 기억하세요. <b>"틀렸을 때 되돌릴 수 있나?"</b>'
      ]
    });
    body.innerHTML = `
      <p class="sort-legend">${Object.values(BIN_LONG).map(esc).join('<br>')}</p>
      <ol class="sort-list">${TASKS.map((x, i) => `<li data-i="${i}">
        <p class="sort-q"><span class="sort-tag">${esc(x.tag)}</span> ${esc(x.t)}</p>
        <div class="sort-bins" role="radiogroup">${Object.entries(BINS).map(([k, v]) => `<button type="button" role="radio" aria-checked="false" data-bin="${k}">${v}</button>`).join('')}</div>
        <p class="sort-why" hidden></p></li>`).join('')}</ol>
      <div class="lab-actions"><button type="button" class="btn" data-act="check">확인하기</button><button type="button" class="btn ghost" data-act="reset">다시 하기</button></div>
      <p class="sort-result" aria-live="polite"></p>`;
    const pickOf = {};
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-bin]');
      if (!b) return;
      const li = b.closest('li'), i = li.dataset.i;
      pickOf[i] = b.dataset.bin;
      li.querySelectorAll('[data-bin]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      li.classList.remove('right', 'wrong'); li.querySelector('.sort-why').hidden = true;
    });
    body.querySelector('[data-act="check"]').addEventListener('click', () => {
      let right = 0, answered = 0;
      body.querySelectorAll('.sort-list > li').forEach(li => {
        const x = TASKS[li.dataset.i], pick = pickOf[li.dataset.i];
        const why = li.querySelector('.sort-why');
        if (!pick) { why.hidden = false; why.textContent = '아직 고르지 않았습니다.'; li.classList.remove('right', 'wrong'); return; }
        answered += 1;
        const ok = x.ok.includes(pick);
        if (ok) right += 1;
        li.classList.toggle('right', ok); li.classList.toggle('wrong', !ok);
        why.hidden = false;
        why.innerHTML = `${ok ? '✅' : `❌ 알맞은 칸: <b>${x.ok.map(k => BINS[k]).join(' 또는 ')}</b>.`} ${esc(x.why)}`;
      });
      body.querySelector('.sort-result').innerHTML = `<b>${right} / ${TASKS.length}</b> ${answered < TASKS.length ? `(${TASKS.length - answered}개는 아직 고르지 않음)` : right === TASKS.length ? '모두 맞았습니다. 기준표의 "되돌릴 수 있는 일부터"가 몸에 붙었습니다.' : '틀린 일의 이유를 읽고 기준표와 다시 비교해 보세요.'}`;
    });
    body.querySelector('[data-act="reset"]').addEventListener('click', () => {
      Object.keys(pickOf).forEach(k => delete pickOf[k]);
      body.querySelectorAll('.sort-list > li').forEach(li => { li.classList.remove('right', 'wrong'); li.querySelector('.sort-why').hidden = true; li.querySelectorAll('[data-bin]').forEach(x => x.setAttribute('aria-checked', 'false')); });
      body.querySelector('.sort-result').textContent = '';
    });
  }

  const LABS = { steps: stepsLab, ledger: ledgerLab, prompt: promptLab, delegate: delegateLab };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lab[data-lab]').forEach(host => {
      const build = LABS[host.dataset.lab];
      if (build) build(host);
    });
  });
})();
