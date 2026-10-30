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

  const LABS = { steps: stepsLab };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lab[data-lab]').forEach(host => {
      const build = LABS[host.dataset.lab];
      if (build) build(host);
    });
  });
})();
