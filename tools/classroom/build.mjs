// 강의자료(lecture/*.md)로 교육생용 정적 사이트(classroom-site/)를 만든다.
// 강사 노트·강사용 정답은 빼고, 사이트 주소는 링크로, 프롬프트에는 복사 버튼을 붙인다.
// 실행: cd tools/classroom && npm install && npm run build
import { marked } from "marked";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LECTURE = path.join(ROOT, "lecture");
// SITE_MODE=preview: 교육 신청 기간용. 처음 화면·교육 신청·사전 과제(01·02)만 열고, 나머지는 "곧 열립니다"로 바꾼다.
const PREVIEW = process.env.SITE_MODE === "preview";
const OPEN_DATE = "11. 4.(수)";
// 교육 신청 페이지. 사전 수요조사로 계획을 확정한 뒤 true로 바꾸고 배포한다 (서버 쪽은 tools/fire-signup/.../_rules.js 의 PAUSED)
const SIGNUP_OPEN = false;
const OUT = path.join(ROOT, PREVIEW ? "classroom-site-preview" : "classroom-site");

const MODULES = [
  ["01_구글 업무 계정 만들기", "구글 업무 계정 만들기", "사전 과제"],
  ["02_ChatGPT와 Claude 가입", "ChatGPT · Claude · GitHub 가입", "사전 과제"],
  ["03_프롬프트·파일·폴더 활용", "프롬프트 · 파일 · 프로젝트", "2교시"],
  ["04_옵시디언 설치와 MD 파일 만들기", "옵시디언 (선택)", "수업 외"],
  ["05_PRD 작성하기", "PRD 작성하기", "1교시"],
  ["06_스킬 만들기", "스킬 만들기", "1교시"],
  ["07_PRD로 결과물 만들기 (NotebookLM·생성형 AI)", "PRD로 결과물 만들기", "1교시"],
  ["08_AI 브라우저 Aside로 코딩 없이 업무 자동화", "AI 브라우저 Aside", "1교시"],
  ["09_(심화) HTML·CSS·JavaScript로 준비물 화면 뜯어보기", "HTML · CSS · JS 맛보기", "20분"],
  ["10_(심화) 프로토타입 배포", "Netlify 배포", "30분"],
  ["12_(심화) Claude Code로 한 번에 만들고 배포하기", "Claude Code로 내 화면", "2교시"],
].map(([file, short, time]) => { const num = parseInt(file, 10); return { file, short, time, num, page: `m${String(num).padStart(2, "0")}.html` }; });

// 교육생이 내려받는 파일: [사이트 안 경로, 원본, 내려받을 때 이름, 설명]
// 사이트 안 경로도 한글 이름으로 둔다. 행정망 보안 프로그램 등이 download 속성을 무시해도 주소의 파일 이름으로 저장되기 때문
const FILES = {
  mine: ["files/지뢰찾기_화면.png", "lecture/실습자료/지뢰찾기_화면.png", "지뢰찾기_화면.png", "지뢰찾기 화면 그림 (몸풀기 화면 캡처용)"],
  prd: ["files/PRD_경주 여행 준비물.md", "lecture/실습자료/PRD_경주 여행 준비물.md", "PRD_경주 여행 준비물.md", "예시 PRD (경주 여행 준비물 체크 v0.1)"],
  guide: ["files/경주 여행 자료_관광지 안내.md", "lecture/실습자료/경주 여행 자료_관광지 안내.md", "경주 여행 자료_관광지 안내.md", "경주 관광지 안내 자료 (파일 건네기 · Gemini Notebook 실습용)"],
  opinions: ["files/경주 여행 후기_예시.md", "lecture/실습자료/경주 여행 후기_예시.md", "경주 여행 후기_예시.md", "경주 여행 후기 모음 (후기 요약 실습용)"],
  template: ["files/PRD 템플릿.md", "lecture/실습자료/PRD 템플릿.md", "PRD 템플릿.md", "빈 PRD 양식"],
  prompts: ["files/프롬프트 모음.md", "lecture/실습자료/프롬프트 모음.md", "프롬프트 모음.md", "프롬프트 모음 파일 (내 업무 폴더 99_프롬프트 보관용)"],
  skill: ["files/prd-interview.zip", null, "prd-interview.zip", "PRD 인터뷰 스킬 (Claude에 바로 올리는 ZIP)"],
  skillmd: ["files/SKILL.md", "lecture/실습자료/스킬/prd-interview/SKILL.md", "SKILL.md", "PRD 인터뷰 스킬 원본 SKILL.md"],
  step1: ["steps/1-html.html", "prototype-demo/steps/1-html.html", "1-html.html", "1단계 HTML (뼈대)"],
  step2: ["steps/2-css.html", "prototype-demo/steps/2-css.html", "2-css.html", "2단계 CSS (옷)"],
  step3: ["steps/3-js.html", "prototype-demo/steps/3-js.html", "3-js.html", "3단계 JavaScript (움직임)"],
  planner: ["files/일정 플래너 (예시).html", "prototype-demo/examples/planner.html", "일정 플래너 (예시).html", "일정 플래너 완성 예시 (캘린더 + 간트차트)"],
  room3d: ["files/3D 방 꾸미기 (예시).html", "prototype-demo/examples/room3d.html", "3D 방 꾸미기 (예시).html", "3D 방 꾸미기 완성 예시 (라이브러리를 파일 안에 넣어 인터넷 없이 열림)"],
  final: ["prototype/index.html", "prototype-demo/index.html", "index.html", "여행 준비물 체크 완성본 (배포 실습용 index.html)"],
};
const MODULE_FILES = { 3: ["mine", "prd", "guide", "opinions"], 5: ["template", "prd"], 6: ["skill", "skillmd"], 7: ["prd", "guide", "opinions"], 9: ["step1", "step2", "step3", "final", "planner", "room3d"], 10: ["final"] };

const SITES = {
  "accounts.google.com/signup": "https://accounts.google.com/signup", "google.com": "https://www.google.com/",
  "gmail.com": "https://mail.google.com/", "chatgpt.com": "https://chatgpt.com/", "claude.ai": "https://claude.ai/",
  "claude.ai/code": "https://claude.ai/code", "notebooklm.google.com": "https://notebooklm.google.com/",
  "obsidian.md": "https://obsidian.md/", "github.com": "https://github.com/", "vercel.com": "https://vercel.com/", "app.netlify.com": "https://app.netlify.com/", "app.netlify.com/drop": "https://app.netlify.com/drop",
  "aside.com": "https://aside.com/",
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── 교육생판으로 거르기 ──
const TEACHER = /🧑‍🏫|강사|리허설/;
const TEACHER_SECTION = /수업 전|강사|완성본/;
const TEACHER_LINE = /준비해 두세요|강의 전에|교육생을 위해/;   // 인용 상자 안의 강사용 줄

function studentMarkdown(md) {
  const lines = md.split("\n");
  const out = [];
  let skipSection = false, inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) skipSection = TEACHER_SECTION.test(line);
    if (skipSection) continue;
    if (!inFence && /^>/.test(line)) {           // 인용 상자 한 묶음을 모아서 판단
      const group = [];
      while (i < lines.length && /^>/.test(lines[i])) group.push(lines[i++]);
      i--;
      if (!TEACHER.test(group.join("\n"))) out.push(...group.filter((g) => !TEACHER_LINE.test(g)));
      continue;
    }
    if (!inFence && /v0\.3 완성본/.test(line)) continue;   // 강사용 자료로 가는 줄
    if (!inFence && /^← /.test(line)) continue;   // 위쪽 이전/다음 줄은 페이지 아래 버튼과 겹친다
    out.push(line);
  }
  return out.join("\n")
    .replace(/\(강사가 공유 링크로 미리 배포\)/g, "(이 페이지 위의 ‘실습 파일’에서 내려받기)")
    .replace(/강사는 직접 고쳐 주지 말고 아래 \*\*질문을 던져\*\* 교육생이 스스로 채우게 합니다\./g, "아래 질문에 스스로 답하며 맥락을 채워 보세요.")
    .replace(/\s*\(정답:[^)]*\)/g, "")
    .replace(/\s*\(리허설[^)]*\)/g, "")
    .replace(/\s*✅ 리허설 완료/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

// [[위키 링크]] → 사이트 안 링크. 코드 안은 그대로 둔다.
function wikiTarget(raw) {
  const name = raw.split("/").pop();
  const mod = MODULES.find((m) => m.file === name);
  if (mod) return [`${String(mod.num).padStart(2, "0")} ${mod.short}`, mod.page];
  if (name === "PRD_경주 여행 준비물") return ["예시 PRD 파일", "files.html#prd"];
  if (name === "경주 여행 자료_관광지 안내") return ["경주 관광지 안내 파일", "files.html#guide"];
  if (name === "경주 여행 후기_예시") return ["경주 여행 후기 파일", "files.html#opinions"];
  if (name === "PRD 템플릿") return ["PRD 템플릿 파일", "files.html#template"];
  if (name === "프롬프트 모음") return ["프롬프트 모음", "prompts.html"];
  if (name === "SKILL") return ["스킬 예시 파일", "files.html#skill"];
  if (name === "지뢰찾기_화면.png") return ["지뢰찾기 화면 그림", "files.html#mine"];
  if (name === "사전 과제 안내") return ["사전 과제 안내", "prework.html"];
  if (name === "과제 안내") return ["과제 안내", "homework.html"];
  if (name === "00_강의 개요") return ["강의 개요", "index.html"];
  return [null, null];   // 강사용 자료(정답, QR 등)는 링크하지 않는다
}
function wikify(md) {
  const conv = (t) => t.replace(/!?\[\[([^\]]+)\]\]/g, (m, raw) => {
    const [label, href] = wikiTarget(raw);
    return href ? `[${label}](${href})` : "강사 안내 자료";
  });
  return md.split(/(```[\s\S]*?```|~~~~[\s\S]*?~~~~)/g)
    .map((part, i) => (i % 2 ? part : part.split(/(`[^`\n]*`)/g).map((p, j) => (j % 2 ? p : conv(p))).join("")))
    .join("");
}

function enhance(html) {
  return html
    .replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>")
    .replace(/<code>([^<]+)<\/code>/g, (m, text) => {
      const url = SITES[text.replace(/&amp;/g, "&")];
      return url ? `<a class="site" href="${url}" target="_blank" rel="noopener"><code>${text}</code></a>` : m;
    })
    .replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"')
    .replace(/<input disabled="" type="checkbox"/g, '<input type="checkbox"')
    .replace(/<input checked="" disabled="" type="checkbox"/g, '<input checked type="checkbox"');
}

function fileBox(keys) {
  const items = keys.map((k) => {
    const [dest, , dl, label] = FILES[k]; const href = encodeURI(dest);
    const open = /\.(html|png)$/.test(href) ? ` <a class="btn ghost" href="${href}" target="_blank" rel="noopener">열어 보기</a>` : "";
    return `<li><span>${esc(label)}</span><span class="acts"><a class="btn" href="${href}" download="${esc(dl)}">내려받기</a>${open}</span></li>`;
  });
  return `<aside class="files-box" aria-label="이 모듈 실습 파일"><h2>이 모듈 실습 파일</h2><ul>${items.join("")}</ul></aside>`;
}

// ── 페이지 틀 ──
function nav(current) {
  const link = (href, label) => `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
  const mods = (from, to) => MODULES.filter((m) => m.num >= from && m.num <= to)
    .map((m) => link(m.page, `${String(m.num).padStart(2, "0")} ${m.short}`)).join("");
  if (PREVIEW) return `<nav aria-label="목차">
    <div class="group">${link("index.html", "처음 화면")}${link("survey.html", "사전 수요조사")}${SIGNUP_OPEN ? link("signup.html", "교육 신청") : ""}${link("prework.html", "사전 과제 안내")}</div>
    <div class="group"><h3>사전 과제</h3>${mods(1, 2)}</div>
    <p class="note">본 강의 자료는 ${OPEN_DATE}에 열립니다.</p>
  </nav>`;
  return `<nav aria-label="목차">
    <div class="group">${link("index.html", "처음 화면")}${link("signup.html", "교육 신청")}${link("prework.html", "사전 과제 안내")}${link("homework.html", "과제 안내")}${link("quiz.html", "오늘의 퀴즈")}</div>
    <div class="group"><h3>본 강의</h3>${mods(1, 3)}${mods(5, 8)}</div>
    <div class="group"><h3>심화 · 직접 만들기</h3>${mods(9, 10)}${mods(12, 12)}</div>
    <div class="group"><h3>선택 자료 (수업 외)</h3>${mods(4, 4)}</div>
    <div class="group"><h3>자료</h3>${link("prompts.html", "프롬프트 모음")}${link("files.html", "실습 파일 내려받기")}</div>
  </nav>`;
}

function page(file, title, body, pager = "") {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · 생성형 AI 활용능력 향상교육</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;600;700&family=Nanum+Gothic+Coding&display=swap">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<div class="app">
  <aside class="side" id="side">
    <a class="brand" href="index.html"><small>소방학교 특별교육 · 처음 시작하는 분들을 위한</small><strong>생성형 AI 활용능력 향상교육</strong></a>
    ${nav(file)}
  </aside>
  <main>
    <div class="topbar"><button type="button" id="menu">☰ 목차</button><span>${esc(title)}</span></div>
    <article>${body}</article>
    ${pager}
  </main>
</div>
<script src="assets/site.js"></script>
</body>
</html>
`;
}

// 이전/다음은 수업 순서대로. 선택 자료(04)는 순서에서 빼고, 04 페이지에서는 앞뒤 수업(03·05)으로 잇는다
const SEQ = MODULES.filter((m) => m.num !== 4);
function pagerFor(i) {
  const cur = MODULES[i];
  const j = cur.num === 4 ? SEQ.findIndex((m) => m.num === 5) - 0.5 : SEQ.indexOf(cur);
  const prev = SEQ[Math.ceil(j) - 1], next = SEQ[Math.floor(j) + 1];
  const a = (m, cls, label) => `<a class="${cls}" href="${m.page}"><span>${label}</span>${String(m.num).padStart(2, "0")} ${esc(m.short)}</a>`;
  return `<div class="pager">${prev ? a(prev, "prev", "← 이전") : '<a class="prev" href="index.html"><span>← 처음</span>처음 화면</a>'}${next ? a(next, "next", "다음 →") : '<a class="next" href="prompts.html"><span>다음 →</span>프롬프트 모음</a>'}</div>`;
}

// 취소선은 ~~두 개~~ 일 때만. "16:00~21:00, 08:00~13:00" 처럼 시간 범위에 ~ 가 두 번 나오면 취소선으로 잘못 읽히기 때문
marked.use({ tokenizer: { del(src) {
  const m = /^~~(?=\S)([\s\S]*?\S)~~/.exec(src);
  if (m) return { type: "del", raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) };
  return undefined;
} } });
// "(과정 뒤)" "(수업 뒤)" "(쉬는 시간·집에서)" 가 붙은 절은 접어 둔다. 수업 중에는 눈에 덜 띄고, 수업 뒤에는 눌러서 본다.
// 그 제목부터 같은 단계 이상의 다음 제목 직전까지를 <details>로 감싼다.
const LATER = /\((과정 뒤|수업 뒤|쉬는 시간·집에서)[),:]/;
function foldLater(html) {
  const heads = [...html.matchAll(/<h([1-4])>([\s\S]*?)<\/h\1>/g)].map((m) => ({ at: m.index, end: m.index + m[0].length, level: +m[1], inner: m[2] }));
  let out = "", pos = 0;
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (h.at < pos || !LATER.test(h.inner.replace(/<[^>]+>/g, ""))) continue;
    const next = heads.slice(i + 1).find((n) => n.level <= h.level);
    const stop = next ? next.at : html.length;
    const body = html.slice(h.end, stop);
    const hr = body.match(/\s*<hr>\s*$/);   // 절 끝의 가로줄은 접힌 상자 밖에 둔다
    out += html.slice(pos, h.at) + `<details class="later later-h${h.level}"><summary><span class="later-tag">과정 뒤에 더 해 보기</span> ${h.inner}</summary>${hr ? body.slice(0, hr.index) : body}</details>${hr ? hr[0] : ""}`;
    pos = stop;
  }
  return out + html.slice(pos);
}
const render = (md) => foldLater(enhance(marked.parse(wikify(studentMarkdown(md)), { gfm: true })));

// ── 만들기 ──
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ["assets", "files", "steps", "prototype"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "site.css"), path.join(OUT, "assets/site.css"));
fs.copyFileSync(path.join(import.meta.dirname, "site.js"), path.join(OUT, "assets/site.js"));

// 오늘의 퀴즈: 문항(정답 제외)은 사이트로, 정답·다시 볼 곳은 서버 함수(api/_lib)로 나눠 만든다
const quizData = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/fire-quiz/quiz-data.json"), "utf8"));
const quizPublic = Object.fromEntries(Object.entries(quizData).map(([id, q]) => [id, { title: q.title, questions: q.questions.map(({ q: text, options }) => ({ q: text, options })) }]));
fs.writeFileSync(path.join(OUT, "assets/fire-quiz-data.js"), `// tools/fire-quiz/quiz-data.json 에서 만든 파일입니다 (정답 없음).\nwindow.FIRE_QUIZ = ${JSON.stringify(quizPublic)};\n`);
fs.copyFileSync(path.join(import.meta.dirname, "fire-quiz.js"), path.join(OUT, "assets/fire-quiz.js"));
fs.mkdirSync(path.join(ROOT, "tools/fire-quiz/api/_lib"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tools/fire-quiz/api/_lib/fire-quiz-key.js"),
  `// tools/fire-quiz/quiz-data.json 에서 build.mjs 가 만든 파일입니다. 직접 고치지 말고 quiz-data.json 을 고친 뒤 다시 만드세요.\n` +
  `module.exports = { keys: ${JSON.stringify(Object.fromEntries(Object.entries(quizData).map(([id, q]) => [id, q.questions.map((x) => x.answer)])))}, ` +
  `where: ${JSON.stringify(Object.fromEntries(Object.entries(quizData).map(([id, q]) => [id, q.questions.map((x) => x.where)])))} };\n`);

for (const [key, [dest, src]] of Object.entries(FILES)) {
  if (src) fs.copyFileSync(path.join(ROOT, src), path.join(OUT, dest));
}
// 스킬 ZIP: 폴더째 압축해야 Claude가 읽는다 (prd-interview/SKILL.md)
execFileSync("zip", ["-q", "-r", path.join(OUT, FILES.skill[0]), "prd-interview"], { cwd: path.join(LECTURE, "실습자료/스킬") });

MODULES.forEach((m, i) => {
  const md = fs.readFileSync(path.join(LECTURE, m.file + ".md"), "utf8");
  let html = render(md);
  if (MODULE_FILES[m.num]) html = html.replace(/(<\/h1>)/, `$1${fileBox(MODULE_FILES[m.num])}`);
  fs.writeFileSync(path.join(OUT, m.page), page(m.page, `${String(m.num).padStart(2, "0")} ${m.short}`, html, pagerFor(i)));
});

const preworkMd = fs.readFileSync(path.join(LECTURE, "사전 과제 안내.md"), "utf8");
fs.writeFileSync(path.join(OUT, "prework.html"), page("prework.html", "사전 과제 안내", render(preworkMd)));
const homeworkMd = fs.readFileSync(path.join(LECTURE, "과제 안내.md"), "utf8");
fs.writeFileSync(path.join(OUT, "homework.html"), page("homework.html", "과제 안내", render(homeworkMd)));
fs.writeFileSync(path.join(OUT, "quiz.html"), page("quiz.html", "오늘의 퀴즈", `
  <h1>오늘의 퀴즈</h1>
  <p class="lead">보기에서 하나를 고르는 8문항, 약 4분입니다. 외울 것은 없고, 수업에서 해 본 것을 떠올리면 풀 수 있습니다. <b>1일차 퀴즈는 2일차 첫 시간</b>에, <b>2일차 퀴즈는 마지막 교시</b>에 휴대폰으로 함께 풉니다.</p>
  <p><a class="btn ghost" href="#day1">1일차 퀴즈</a> <a class="btn ghost" href="#day2">2일차 퀴즈</a> <a class="btn ghost" href="#board">결과 공유판</a></p>
  <section class="quiz" id="day1" data-quiz="day1"></section>
  <section class="quiz" id="day2" data-quiz="day2"></section>
  <section class="quiz board" id="board"><h2>결과 공유판</h2><div data-board></div></section>
  <noscript><p>퀴즈는 JavaScript가 켜져 있어야 보입니다.</p></noscript>
  <script src="assets/fire-quiz-data.js"></script>
  <script src="assets/fire-quiz.js"></script>`));

// 교육 신청 (서버: /api/fire-signup, tools/fire-signup/api)
fs.copyFileSync(path.join(import.meta.dirname, "fire-signup.js"), path.join(OUT, "assets/fire-signup.js"));
fs.writeFileSync(path.join(OUT, "signup.html"), page("signup.html", "교육 신청", `
  <h1>교육 신청</h1>
  <p class="lead">「생성형 AI 활용능력 향상교육」 참여 신청입니다. 이 페이지에서 직접 신청하면 됩니다. <b>신청 마감: 2026. 10. 28.(수) 18:00</b></p>
  <div class="table-wrap"><table class="signup-sched"><tbody>
    <tr><th>1차</th><td>11. 6.(금) 16:00~21:00 · 11. 7.(토) 08:00~13:00</td></tr>
    <tr><th>2차</th><td>11. 20.(금) 16:00~21:00 · 11. 21.(토) 08:00~13:00</td></tr>
    <tr><th>장소</th><td>교육훈련관 2층 정보화교육장 · 차수별 20명 내외 · 별도 식사 시간 없음</td></tr>
  </tbody></table></div>

  <h2>신청 전에: 구글 계정 만들기</h2>
  <p>신청서에 <b>구글 계정(Gmail)</b>을 적습니다. 이 주소로 실습용 Claude 계정 초대가 갑니다. 계정이 없으면 먼저 만드세요. 행정망 PC에서는 가입 화면이 막힐 수 있으니 <b>휴대폰</b>에서 하는 것이 편합니다.</p>
  <p><a class="btn" href="m01.html">01 구글 업무 계정 만들기 보기</a></p>

  <section class="quiz signup" id="signup">
    <h2>신청서</h2>
    <form novalidate>
      <div class="signup-grid">
        <label>성명<input name="name" maxlength="20" autocomplete="name" required></label>
        <label>소속<input name="dept" maxlength="30" placeholder="예: 교수부" required></label>
        <label>직급<input name="rank" maxlength="15" placeholder="예: 소방위" required></label>
      </div>
      <fieldset><legend>희망 차수</legend>
        <label class="quiz-option"><input type="radio" name="cohort" value="1"> 1차 (11. 6.~7.)</label>
        <label class="quiz-option"><input type="radio" name="cohort" value="2"> 2차 (11. 20.~21.)</label>
        <label class="quiz-option"><input type="radio" name="cohort" value="any"> 어느 차수든 가능</label>
      </fieldset>
      <fieldset><legend>생성형 AI(ChatGPT·Claude 등) 사용 경험</legend>
        <label class="quiz-option"><input type="radio" name="exp" value="none"> 써 본 적 없음</label>
        <label class="quiz-option"><input type="radio" name="exp" value="few"> 몇 번 써 봄</label>
        <label class="quiz-option"><input type="radio" name="exp" value="some"> 가끔 업무에 씀</label>
        <label class="quiz-option"><input type="radio" name="exp" value="often"> 자주 업무에 씀</label>
      </fieldset>
      <label class="signup-email">구글 계정(이메일)<input name="email" type="email" maxlength="100" autocomplete="email" placeholder="예: hong.gildong.work@gmail.com" required></label>
      <p class="signup-email-hint" hidden>⚠️ Gmail 주소가 아닙니다. 01에서 만든 <b>구글 계정</b> 주소가 맞는지 확인해 주세요.</p>
      <p class="signup-note">손으로 치지 말고 <b>복사해서 붙여넣어</b> 주세요. 오타가 있으면 초대를 받을 수 없습니다.</p>
      <details class="signup-privacy" open><summary>개인정보 수집·이용 안내</summary>
        <ul>
          <li><b>수집 항목</b>: 성명, 소속, 직급, 구글 계정(이메일), 희망 차수, AI 사용 경험</li>
          <li><b>목적</b>: 교육 차수 배정, 실습용 Claude Team 계정 초대, 교육 운영 안내</li>
          <li><b>보관 기간</b>: 교육 종료 후 파기 (2026. 11. 30.까지)</li>
          <li><b>보관 위치</b>: 이 교육자료 사이트의 결과 저장 서버 (관리 비밀번호가 있는 담당자만 열람)</li>
          <li>동의하지 않으면 이 페이지로는 신청할 수 없습니다. 교수부 조영진(☎ 4984)에게 문의해 주세요.</li>
        </ul>
      </details>
      <label class="signup-check"><input type="checkbox" name="agreePrivacy"> 위 개인정보 수집·이용에 동의합니다.</label>
      <label class="signup-check"><input type="checkbox" name="agreeTeam"> 소속 팀장과 교육 일정을 협의했습니다.</label>
      <div class="quiz-actions"><button class="btn" type="submit">신청하기</button><p class="quiz-status signup-status" aria-live="polite"></p></div>
    </form>
    <div class="signup-done quiz-result" hidden>
      <p class="quiz-score signup-done-title"></p>
      <p>초대 메일을 받을 주소: <b class="signup-done-email"></b></p>
      <p><b>다음 할 일</b></p>
      <ol>
        <li>차수 배정 결과는 <b>10. 30.(금)</b>까지 개별로 안내합니다.</li>
        <li><a href="prework.html">사전 과제 안내</a>대로 <b>ChatGPT·GitHub</b>에 교육 시작 전날까지 가입합니다.</li>
        <li>Claude 초대 메일이 오면 수락합니다 (1차: 10. 30.경 → <b>11. 4.(수)까지</b>, 2차: 11. 17. 저녁 → <b>11. 18.(수)까지</b>).</li>
      </ol>
      <p><button class="btn ghost signup-again" type="button">신청 내용 고치기</button> 같은 구글 계정으로 다시 내면 앞의 신청이 고쳐집니다.</p>
    </div>
  </section>

  <section class="quiz" id="signup-lookup">
    <h2>내 신청 확인 · 취소</h2>
    <div class="signup-grid">
      <label>구글 계정(이메일)<input id="lookup-email" type="email" autocomplete="email"></label>
      <label>성명<input id="lookup-name" maxlength="20" autocomplete="name"></label>
    </div>
    <div class="board-buttons">
      <button class="btn" type="button" data-lookup="check">확인</button>
      <button class="btn ghost" type="button" data-lookup="cancel-ask">신청 취소…</button>
      <span class="lookup-confirm" hidden>정말 취소할까요? <button class="btn" type="button" data-lookup="cancel">네, 취소합니다</button> <button class="btn ghost" type="button" data-lookup="cancel-no">아니요</button></span>
    </div>
    <p class="quiz-status lookup-out" aria-live="polite"></p>
  </section>

  <details class="board-admin" id="signup-admin"><summary>담당자 전용: 신청 현황</summary>
    <div class="board-admin-body">
      <label for="signup-key">관리 비밀번호</label>
      <input id="signup-key" type="password" autocomplete="off">
      <div class="board-buttons">
        <button class="btn" type="button" data-admin="list">신청 현황 불러오기</button>
        <button class="btn ghost" type="button" data-admin="delete-all-ask">모든 신청 기록 삭제…</button>
        <span class="signup-delete-confirm" hidden>교육이 끝났나요? 모든 신청 기록을 지웁니다. <button class="btn" type="button" data-admin="delete-all">네, 지웁니다</button> <button class="btn ghost" type="button" data-admin="delete-all-cancel">취소</button></span>
      </div>
      <p class="board-admin-status signup-admin-status" aria-live="polite"></p>
      <div class="signup-admin-view"></div>
    </div>
  </details>
  <noscript><p>신청서는 JavaScript가 켜져 있어야 보입니다.</p></noscript>
  <script src="assets/fire-signup.js"></script>`));

// ── 사전 수요조사 (교육 계획 확정 전, 교직원 42명 대상) ──
fs.copyFileSync(path.join(import.meta.dirname, "fire-survey.js"), path.join(OUT, "assets/fire-survey.js"));
fs.copyFileSync(path.join(import.meta.dirname, "survey-og.png"), path.join(OUT, "assets/survey-og.png"));   // 카톡 등에 링크를 보낼 때 뜨는 미리보기 그림
const opt = (type, name, value, label) => `<label class="quiz-option"><input type="${type}" name="${name}" value="${value}"> ${label}</label>`;
const OG = (url, title, desc, img) => `<meta property="og:type" content="website">\n<meta property="og:url" content="${url}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n<meta property="og:image" content="${img}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="description" content="${desc}">\n<meta name="twitter:card" content="summary_large_image">\n`;
fs.writeFileSync(path.join(OUT, "survey.html"), page("survey.html", "사전 수요조사", `
  <h1>사전 수요조사</h1>
  <p class="lead">「생성형 AI 활용능력 향상교육」 계획을 확정하기 전에 <b>참여 수요와 가능한 일정</b>을 알아보려고 합니다. 응답은 약 3분 걸립니다. <b>조사 마감: 2026. 10. 23.(금) 18:00</b></p>
  <p class="note">이 조사는 <b>교육 신청이 아닙니다.</b> 참여 희망 인원이 20명 이하면 1차만, 20명을 넘으면 2차까지 운영합니다. 주말이 어려운 분이 많으면 평일 일정을 검토합니다. 교육 신청은 계획이 확정되면 따로 안내합니다.</p>

  <h2>교육 개요 (예정)</h2>
  <div class="table-wrap"><table class="signup-sched"><tbody>
    <tr><th>주제</th><td><b>AI 시대, 여행 계획이 달라졌다</b> — 우리 집 여행 담당의 이틀. 경주 2박 3일 가족 여행을 AI와 준비하며, 같은 방법을 업무에 옮깁니다.</td></tr>
    <tr><th>만드는 것</th><td>가족 단톡방 여행 일정 안내, 여행 자료 요약, "경주 일정표" 스킬, 여행 소개 슬라이드, 가족 준비물 체크 화면(휴대폰으로 여는 웹 화면), 내 업무 화면</td></tr>
    <tr><th>운영</th><td>차수별 2일 10시간 · 1일차(금) 16:00~21:00, 2일차(토) 08:00~13:00 · 차수별 20명 내외 · AI를 처음 써도 참여 가능</td></tr>
    <tr><th>예정 일정</th><td>1차 11. 6.(금)~7.(토) · 2차 11. 20.(금)~21.(토)</td></tr>
    <tr><th>장소</th><td>교육훈련관 2층 정보화교육장 (1인 1PC)</td></tr>
    <tr><th>사전 준비</th><td>업무용 구글 계정, ChatGPT · GitHub 가입 (약 40분, <a href="prework.html">따라 하기 안내</a> 제공)</td></tr>
  </tbody></table></div>

  <section class="quiz signup" id="survey">
    <h2>응답</h2>
    <form novalidate>
      <div class="signup-grid">
        <label>성명<input name="name" maxlength="20" autocomplete="name" required></label>
        <label>소속<input name="dept" maxlength="30" placeholder="예: 교수부" required></label>
        <label>직급<input name="rank" maxlength="15" placeholder="예: 소방위" required></label>
      </div>
      <fieldset><legend>1. 참여 의향</legend>
        ${opt("radio", "intent", "yes", "꼭 참여하고 싶다")}${opt("radio", "intent", "maybe", "일정이 맞으면 참여하겠다")}${opt("radio", "intent", "no", "이번에는 어렵다")}
      </fieldset>
      <fieldset><legend>2. 예정 일정(금 저녁 + 토 오전) 중 가능한 차수</legend>
        ${opt("radio", "cohort", "1", "1차 11. 6.(금)~7.(토)")}${opt("radio", "cohort", "2", "2차 11. 20.(금)~21.(토)")}${opt("radio", "cohort", "both", "둘 다 가능")}${opt("radio", "cohort", "none", "둘 다 어렵다")}
      </fieldset>
      <fieldset><legend>3. 주말이 어렵다면, 가능한 평일 방식 (여러 개 선택 가능)</legend>
        ${opt("checkbox", "modes", "a", "이틀: 퇴근 무렵 + 다음 날 오전 (예: 목 16~21시, 금 08~13시)")}${opt("checkbox", "modes", "b", "이틀: 근무시간 중 하루 5시간 (예: 09~14시)")}${opt("checkbox", "modes", "c", "나흘: 하루 2시간 30분 (예: 16:00~18:30)")}${opt("checkbox", "modes", "etc", "기타")}
        <label>기타 방식 (선택)<input name="modeEtc" maxlength="60" placeholder="예: 평일 저녁 3일"></label>
      </fieldset>
      <fieldset><legend>4. 평일에 가능한 요일 · 시기 (여러 개 선택 가능)</legend>
        <div class="survey-row">${opt("checkbox", "days", "mon", "월")}${opt("checkbox", "days", "tue", "화")}${opt("checkbox", "days", "wed", "수")}${opt("checkbox", "days", "thu", "목")}${opt("checkbox", "days", "fri", "금")}</div>
        ${opt("checkbox", "weeks", "w2", "11월 2주 (11. 9.~13.)")}${opt("checkbox", "weeks", "w3", "11월 3주 (11. 16.~20.)")}${opt("checkbox", "weeks", "w4", "11월 4주 (11. 23.~27.)")}${opt("checkbox", "weeks", "d1", "12월 1주 (11. 30.~12. 4.)")}
      </fieldset>
      <fieldset><legend>5. 생성형 AI(ChatGPT·Claude 등) 사용 경험</legend>
        ${opt("radio", "exp", "none", "써 본 적 없음")}${opt("radio", "exp", "few", "몇 번 써 봄")}${opt("radio", "exp", "some", "가끔 씀")}${opt("radio", "exp", "often", "자주 씀")}
      </fieldset>
      <fieldset><legend>6. 써 본 AI 도구 (여러 개 선택 가능)</legend>
        <div class="survey-row">${opt("checkbox", "tools", "chatgpt", "ChatGPT")}${opt("checkbox", "tools", "claude", "Claude")}${opt("checkbox", "tools", "gemini", "Gemini")}${opt("checkbox", "tools", "wrtn", "뤼튼")}${opt("checkbox", "tools", "etc", "기타")}${opt("checkbox", "tools", "none", "없음")}</div>
        <label>기타 도구 (선택)<input name="toolEtc" maxlength="40"></label>
      </fieldset>
      <label class="survey-wish">7. AI로 도움받고 싶은 일 (선택)<textarea name="wish" maxlength="300" rows="3" placeholder="예: 매번 쓰는 보고서, 반복 집계, 안내문 작성, 가족 여행 계획"></textarea></label>
      <details class="signup-privacy"><summary>개인정보 수집·이용 안내</summary>
        <ul>
          <li><b>수집 항목</b>: 성명, 소속, 직급, 위 응답 내용</li>
          <li><b>목적</b>: 교육 차수·일정 결정 (교육 계획 수립)</li>
          <li><b>보관 기간</b>: 교육 계획 확정 후 파기 (늦어도 2026. 11. 30.까지)</li>
          <li><b>보관 위치</b>: 이 교육자료 사이트의 결과 저장 서버 (관리 비밀번호가 있는 담당자만 열람)</li>
        </ul>
      </details>
      <label class="signup-check"><input type="checkbox" name="agree"> 위 개인정보 수집·이용에 동의합니다.</label>
      <div class="quiz-actions"><button class="btn" type="submit">응답 보내기</button><p class="quiz-status signup-status" aria-live="polite"></p></div>
    </form>
    <div class="signup-done quiz-result" hidden>
      <p class="quiz-score signup-done-title"></p>
      <p>결과를 모아 교육 차수와 일정을 정한 뒤 <b>교육 신청</b>을 안내합니다.</p>
      <p><button class="btn ghost signup-again" type="button">응답 고치기</button> 같은 소속·성명으로 다시 보내면 앞의 응답이 고쳐집니다.</p>
    </div>
  </section>

  <details class="board-admin" id="survey-admin"><summary>담당자 전용: 수요조사 집계</summary>
    <div class="board-admin-body">
      <label for="survey-key">관리 비밀번호</label>
      <input id="survey-key" type="password" autocomplete="off">
      <div class="board-buttons">
        <button class="btn" type="button" data-admin="list">집계 불러오기</button>
        <button class="btn ghost" type="button" data-admin="delete-all-ask">모든 응답 삭제…</button>
        <span class="signup-delete-confirm" hidden>계획이 확정됐나요? 모든 응답을 지웁니다. <button class="btn" type="button" data-admin="delete-all">네, 지웁니다</button> <button class="btn ghost" type="button" data-admin="delete-all-cancel">취소</button></span>
      </div>
      <p class="board-admin-status signup-admin-status" aria-live="polite"></p>
      <div class="signup-admin-view"></div>
    </div>
  </details>
  <noscript><p>조사표는 JavaScript가 켜져 있어야 보입니다.</p></noscript>
  <script src="assets/fire-survey.js"></script>`));
{ const f = path.join(OUT, "survey.html"); const base = "https://www.jg-sobang.com/fire-ai/";
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("</title>", "</title>\n" + OG(base + "survey.html", "사전 수요조사 · 생성형 AI 활용능력 향상교육", "참여 의향과 가능한 일정을 알려 주세요 (휴대폰 3분, 10. 23.(금)까지). 결과로 2차 운영 여부와 평일 일정을 정합니다.", base + "assets/survey-og.png"))); }

const promptsMd = fs.readFileSync(path.join(ROOT, FILES.prompts[1]), "utf8").replace(/^←.*\n/m, "");
fs.writeFileSync(path.join(OUT, "prompts.html"), page("prompts.html", "프롬프트 모음",
  `<p class="lead">수업에서 쓰는 프롬프트를 모았습니다. 상자 오른쪽 위 <b>[복사]</b>를 누르고 ChatGPT·Claude 입력창에 붙여넣으세요. </p><p class="lead"><a class="btn" href="${encodeURI(FILES.prompts[0])}" download="${FILES.prompts[2]}">프롬프트 모음 파일(.md) 내려받기</a> 내 업무 폴더(<code>문서 &gt; AI업무자료 &gt; 99_프롬프트</code>)에 넣어 두면 수업 뒤에도 쓸 수 있습니다.</p>` + render(promptsMd)));

const allFiles = Object.entries(FILES).map(([k, [dest, , dl, label]]) => {
  const href = encodeURI(dest);
  const open = /\.(html|png)$/.test(href) ? ` <a class="btn ghost" href="${href}" target="_blank" rel="noopener">열어 보기</a>` : "";
  const used = Object.entries(MODULE_FILES).filter(([, ks]) => ks.includes(k)).map(([n]) => `모듈 ${String(n).padStart(2, "0")}`).join(", ");
  return `<tr id="${k === "skillmd" ? "skill" : k}"><td>${esc(label)}</td><td>${used}</td><td class="acts"><a class="btn" href="${href}" download="${esc(dl)}">내려받기</a>${open}</td></tr>`;
}).join("");
fs.writeFileSync(path.join(OUT, "files.html"), page("files.html", "실습 파일 내려받기",
  `<h1>실습 파일 내려받기</h1><p class="lead">내려받은 파일은 내 업무 폴더(<code>문서 &gt; AI업무자료</code>)의 알맞은 폴더로 옮겨 두세요.</p>
  <div class="table-wrap"><table><thead><tr><th>파일</th><th>쓰는 모듈</th><th></th></tr></thead><tbody>${allFiles}</tbody></table></div>
  <h2>스킬 파일 내용 (SKILL.md)</h2><p>ZIP을 올릴 수 없는 경우, 아래 내용을 복사해 메모장에 붙여넣고 <code>98_스킬</code> 폴더에 <code>SKILL.md</code>로 저장해 두세요.</p>
  <pre><code>${esc(fs.readFileSync(path.join(ROOT, FILES.skillmd[1]), "utf8"))}</code></pre>`));

const siteLinks = [
  ["Google 계정 만들기", "accounts.google.com/signup", "01"], ["ChatGPT", "chatgpt.com", "02"], ["Claude", "claude.ai", "02"],
  ["Gemini Notebook", "notebooklm.google.com", "07"], ["GitHub", "github.com", "12"],
  ["Netlify", "app.netlify.com", "10"], ["Claude Code", "claude.ai/code", "12"], ["Aside", "aside.com", "08"],
].sort((a, b) => a[2].localeCompare(b[2])).map(([label, host, mod]) => `<a class="tile" href="${SITES[host]}" target="_blank" rel="noopener"><b>${esc(label)}</b><span>${host}</span><small>모듈 ${mod}</small></a>`).join("");
const mods3 = (from, to) => MODULES.filter((m) => m.num >= from && m.num <= to && m.num !== 4);
const modItems = (list) => list.map((m) => `<li><a href="${m.page}"><span class="no">${String(m.num).padStart(2, "0")}</span><span class="t">${esc(m.short)}</span><span class="time">${m.time}</span></a></li>`).join("");
fs.writeFileSync(path.join(OUT, "index.html"), page("index.html", "처음 화면", `
  <h1>생성형 AI 활용능력 향상교육</h1>
  <p class="lead"><b>AI 시대, 여행 계획이 달라졌다.</b> 우리 집 여행 담당이 되어 경주 2박 3일 가족 여행을 AI와 함께 준비합니다. 일정 짜기, 자료 정리, 여행 일정표 스킬, 준비물 체크 화면을 만들어 가족에게 링크로 보내기까지 한 단계씩 따라 하고, 같은 방법을 내 업무에 옮깁니다.</p>
  <p class="note"><b>1차</b> 11. 6.(금)~7.(토) · <b>2차</b> 11. 20.(금)~21.(토) · 신청 마감 <b>10. 28.(수) 18:00</b> <a class="btn" href="signup.html">교육 신청하기</a></p>
  <h2>사전 과제 · 수업 전에 각자</h2>
  <ol class="mods">${modItems(MODULES.slice(0, 2))}</ol>
  <p><a class="btn" href="prework.html">사전 과제 안내 보기</a> 첫날 전까지 해 올 것과 준비물을 한 장에 정리했습니다.</p>
  <h2>1일차 (1~5교시) · AI에게 일 시키기, PRD, 스킬, 내 화면 시안</h2>
  <ol class="mods">${modItems(mods3(3, 7))}</ol>
  <h2>2일차 (6~10교시) · 코딩 없이 자동화, 웹에 공개하기, 내 업무 화면 만들기</h2>
  <ol class="mods">${modItems(MODULES.filter((m) => m.num >= 8))}</ol>
  <p class="note">2일 연속, 총 10시간입니다. <b>1일차 16:00~21:00, 2일차 08:00~13:00</b> (하루 5교시, 1교시 = 50분 수업 + 10분 휴식). 04 옵시디언은 수업 외 선택 자료입니다. 1일차 끝나고 해 볼 것과 과정 뒤 과제는 <a href="homework.html">과제 안내</a>에 있습니다.</p>
  <h2>바로가기</h2>
  <div class="tiles">${siteLinks}</div>
  <h2>자료</h2>
  <p><a href="prompts.html">프롬프트 모음</a> · <a href="files.html">실습 파일 내려받기</a></p>
  <h2>준비물</h2>
  <ul><li><b>사전 과제</b>: 업무용 구글 계정 → <a href="signup.html">교육 신청</a>(구글 계정 적기, 10. 28. 18시까지) → ChatGPT·GitHub 가입 → Claude Team 초대 수락 — <a href="prework.html">사전 과제 안내</a></li><li>본인 명의 휴대폰 (문자 인증, 배포한 내 화면 확인용)</li><li>비밀번호를 적어 둘 수첩</li><li>내 업무 중 "AI로 도움받고 싶은 일" 한 가지</li></ul>
  <p class="note">체크박스 표시는 이 PC의 브라우저에만 저장됩니다.</p>`));

// ── 신청 기간 미리보기: 열어 둘 페이지 말고는 모두 "곧 열립니다"로 덮고, 실습 파일·퀴즈는 올리지 않는다 ──
if (PREVIEW) {
  const keep = new Set(["survey.html", ...(SIGNUP_OPEN ? ["signup.html"] : []), "prework.html", ...MODULES.filter((m) => m.num <= 2).map((m) => m.page)]);
  for (const d of ["files", "steps", "prototype"]) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  for (const f of fs.readdirSync(path.join(OUT, "assets"))) if (f.startsWith("fire-quiz")) fs.rmSync(path.join(OUT, "assets", f));
  const soon = `<h1>곧 열립니다</h1>
  <p class="lead">본 강의 자료는 <b>${OPEN_DATE}</b>에 열립니다.</p>
  <p>지금은 ${SIGNUP_OPEN ? '<a href="signup.html">교육 신청</a>' : '<a href="survey.html">사전 수요조사</a>'}과 <a href="prework.html">사전 과제</a>만 볼 수 있습니다. 수업 이틀 전에 이 자리에서 강의 자료를 만나실 수 있습니다.</p>
  <p>${SIGNUP_OPEN ? '<a class="btn" href="signup.html">교육 신청하기</a>' : '<a class="btn" href="survey.html">수요조사 응답하기</a>'} <a class="btn ghost" href="prework.html">사전 과제 안내 보기</a></p>`;
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith(".html") || f === "index.html" || keep.has(f)) continue;
    fs.writeFileSync(path.join(OUT, f), page(f, "곧 열립니다", soon));
  }
  if (!SIGNUP_OPEN) fs.writeFileSync(path.join(OUT, "signup.html"), page("signup.html", "교육 신청", `<h1>교육 신청은 곧 열립니다</h1>
  <p class="lead">지금은 <b>사전 수요조사</b> 기간입니다. 조사 결과로 교육 차수와 일정을 확정한 뒤 이 페이지에서 교육 신청을 받습니다.</p>
  <p>참여 의향과 가능한 일정을 먼저 알려 주세요 (3분, <b>10. 23.(금)까지</b>).</p>
  <p><a class="btn" href="survey.html">수요조사 응답하기</a> <a class="btn ghost" href="prework.html">사전 과제 안내 보기</a></p>`));
  fs.writeFileSync(path.join(OUT, "index.html"), page("index.html", "처음 화면", `
  <h1>생성형 AI 활용능력 향상교육</h1>
  <p class="lead"><b>AI 시대, 여행 계획이 달라졌다.</b> 우리 집 여행 담당이 되어 경주 2박 3일 가족 여행을 AI와 함께 준비합니다. 일정 짜기, 자료 정리, 준비물 체크 화면을 만들어 가족에게 링크로 보내기까지 한 단계씩 따라 하고, 같은 방법을 내 업무에 옮깁니다.</p>
  <p class="note"><b>1차</b> 11. 6.(금)~7.(토) · <b>2차</b> 11. 20.(금)~21.(토) · 1일차 16:00~21:00, 2일차 08:00~13:00 (총 10시간)${SIGNUP_OPEN ? '<br>신청 마감 <b>10. 28.(수) 18:00</b>' : ' · <b>예정</b>, 수요조사 뒤 확정'}</p>
  <h2>지금 할 일</h2>
  <p><b>사전 수요조사</b> — 참여 의향과 가능한 일정을 알려 주세요 (3분, <b>10. 23.(금)까지</b>). 결과로 2차 운영 여부와 평일 일정을 정합니다. <a class="btn" href="survey.html">수요조사 응답하기</a></p>
  <ol>
    <li><b>교육 신청</b> — ${SIGNUP_OPEN ? '업무용 구글 계정을 적어 신청합니다. <a class="btn" href="signup.html">교육 신청하기</a>' : '수요조사 뒤 계획이 확정되면 이 사이트에서 신청을 받습니다.'}</li>
    <li><b>사전 과제</b> — 첫날 전까지 계정 만들기와 가입을 해 옵니다. <a class="btn ghost" href="prework.html">사전 과제 안내 보기</a></li>
  </ol>
  <h2>사전 과제</h2>
  <ol class="mods">${modItems(MODULES.slice(0, 2))}</ol>
  <p class="note">본 강의 자료(3교시~10교시, 프롬프트 모음, 실습 파일)는 <b>${OPEN_DATE}</b>에 이 사이트에서 열립니다.</p>`));
}

console.log("built", OUT, fs.readdirSync(OUT).length, "entries");
