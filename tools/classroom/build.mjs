// 강의자료(lecture/*.md)로 교육생용 정적 사이트(classroom-site/)를 만든다.
// 강사 노트·강사용 정답은 빼고, 사이트 주소는 링크로, 프롬프트에는 복사 버튼을 붙인다.
// 실행: cd tools/classroom && npm install && npm run build
import { marked } from "marked";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LECTURE = path.join(ROOT, "lecture");
const OUT = path.join(ROOT, "classroom-site");

const MODULES = [
  ["01_구글 업무 계정 만들기", "구글 업무 계정 만들기", "사전 과제"],
  ["02_ChatGPT와 Claude 가입", "ChatGPT · Claude 가입", "사전 과제"],
  ["03_프롬프트·파일·폴더 활용", "프롬프트 · 파일 · 프로젝트", "2교시"],
  ["04_옵시디언 설치와 MD 파일 만들기", "옵시디언과 MD 파일", "1교시"],
  ["05_PRD 작성하기", "PRD 작성하기", "1교시"],
  ["06_스킬 만들기", "스킬 만들기", "1교시"],
  ["07_PRD로 결과물 만들기 (NotebookLM·생성형 AI)", "PRD로 결과물 만들기", "1교시"],
  ["08_AI 브라우저 Aside로 코딩 없이 업무 자동화", "AI 브라우저 Aside", "1교시"],
  ["09_(심화) HTML·CSS·JavaScript로 강의평가 화면 뜯어보기", "HTML · CSS · JS 뜯어보기", "1교시"],
  ["10_(심화) 프로토타입 배포", "GitHub · Vercel 배포", "1교시"],
  ["11_(심화) Firebase로 공용 장부 연결", "Firebase 공용 장부 (선택)", "수업 외"],
  ["12_(심화) Claude Code로 한 번에 만들고 배포하기", "Claude Code로 내 화면", "2교시"],
].map(([file, short, time], i) => ({ file, short, time, num: i + 1, page: `m${String(i + 1).padStart(2, "0")}.html` }));

// 교육생이 내려받는 파일: [사이트 안 경로, 원본, 내려받을 때 이름, 설명]
// 사이트 안 경로도 한글 이름으로 둔다. 행정망 보안 프로그램 등이 download 속성을 무시해도 주소의 파일 이름으로 저장되기 때문
const FILES = {
  mine: ["files/지뢰찾기_화면.png", "lecture/실습자료/지뢰찾기_화면.png", "지뢰찾기_화면.png", "지뢰찾기 화면 그림 (몸풀기 화면 캡처용)"],
  prd: ["files/PRD_강의평가 결과보고.md", "lecture/실습자료/PRD_강의평가 결과보고.md", "PRD_강의평가 결과보고.md", "예시 PRD (강의평가 결과보고 v0.1)"],
  opinions: ["files/강의평가_자유의견_예시.md", "lecture/실습자료/강의평가_자유의견_예시.md", "강의평가_자유의견_예시.md", "강의평가 자유의견 예시 (서술형 요약 실습용)"],
  template: ["files/PRD 템플릿.md", "lecture/실습자료/PRD 템플릿.md", "PRD 템플릿.md", "빈 PRD 양식"],
  prompts: ["files/프롬프트 모음.md", "lecture/실습자료/프롬프트 모음.md", "프롬프트 모음.md", "프롬프트 모음 파일 (옵시디언 99_프롬프트 폴더 보관용)"],
  skill: ["files/prd-interview.zip", null, "prd-interview.zip", "PRD 인터뷰 스킬 (Claude에 바로 올리는 ZIP)"],
  skillmd: ["files/SKILL.md", "lecture/실습자료/스킬/prd-interview/SKILL.md", "SKILL.md", "PRD 인터뷰 스킬 원본 SKILL.md"],
  quizreq: ["files/문제출제_의뢰서_예시.md", "lecture/실습자료/문제출제_의뢰서_예시.md", "문제출제_의뢰서_예시.md", "문제출제 의뢰서 (실습용 예시)"],
  quizsrc: ["files/교재발췌_연소와소화의기초.md", "lecture/실습자료/교재발췌_연소와소화의기초.md", "교재발췌_연소와소화의기초.md", "교재 발췌: 연소와 소화의 기초 (실습용)"],
  quizcard: ["files/객관식_문제카드_양식(별지제4호서식).hwpx", "lecture/실습자료/객관식_문제카드_양식(별지제4호서식).hwpx", "객관식_문제카드_양식(별지제4호서식).hwpx", "객관식 문제카드 빈 양식 (별지 제4호서식)"],
  quizzip: ["files/quiz-generator.zip", null, "quiz-generator.zip", "문제출제 스킬 (조직 배포가 안 됐을 때 개인 등록용 ZIP)"],
  step1: ["steps/1-html.html", "prototype-demo/steps/1-html.html", "1-html.html", "1단계 HTML (뼈대)"],
  step2: ["steps/2-css.html", "prototype-demo/steps/2-css.html", "2-css.html", "2단계 CSS (옷)"],
  step3: ["steps/3-js.html", "prototype-demo/steps/3-js.html", "3-js.html", "3단계 JavaScript (움직임)"],
  final: ["prototype/index.html", "prototype-demo/index.html", "index.html", "강의평가 집계 완성본 (배포 실습용 index.html)"],
};
const MODULE_FILES = { 3: ["mine", "prd", "opinions"], 4: ["prd", "opinions"], 5: ["template", "prd"], 6: ["skill", "skillmd", "quizreq", "quizsrc", "quizcard", "quizzip"], 7: ["prd", "opinions"], 9: ["step1", "step2", "step3", "final"], 10: ["final"] };

const SITES = {
  "accounts.google.com/signup": "https://accounts.google.com/signup", "google.com": "https://www.google.com/",
  "gmail.com": "https://mail.google.com/", "chatgpt.com": "https://chatgpt.com/", "claude.ai": "https://claude.ai/",
  "claude.ai/code": "https://claude.ai/code", "notebooklm.google.com": "https://notebooklm.google.com/",
  "obsidian.md": "https://obsidian.md/", "github.com": "https://github.com/", "vercel.com": "https://vercel.com/",
  "console.firebase.google.com": "https://console.firebase.google.com/", "aside.com": "https://aside.com/",
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
  if (name === "PRD_강의평가 결과보고") return ["예시 PRD 파일", "files.html#prd"];
  if (name === "강의평가_자유의견_예시") return ["자유의견 예시 파일", "files.html#opinions"];
  if (name === "문제출제_의뢰서_예시") return ["출제 의뢰서 파일", "files.html#quizreq"];
  if (name === "교재발췌_연소와소화의기초") return ["교재 발췌 파일", "files.html#quizsrc"];
  if (name === "PRD 템플릿") return ["PRD 템플릿 파일", "files.html#template"];
  if (name === "프롬프트 모음") return ["프롬프트 모음", "prompts.html"];
  if (name === "SKILL") return ["스킬 예시 파일", "files.html#skill"];
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
  return `<nav aria-label="목차">
    <div class="group">${link("index.html", "처음 화면")}${link("prework.html", "사전 과제 안내")}${link("homework.html", "과제 안내")}</div>
    <div class="group"><h3>본 강의</h3>${mods(1, 8)}</div>
    <div class="group"><h3>심화 · 직접 만들기</h3>${mods(9, 10)}${mods(12, 12)}</div>
    <div class="group"><h3>선택 자료 (수업 외)</h3>${mods(11, 11)}</div>
    <div class="group"><h3>자료</h3>${link("prompts.html", "프롬프트 모음")}${link("files.html", "실습 파일 내려받기")}</div>
  </nav>`;
}

function page(file, title, body, pager = "") {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · 생성형 AI 입문</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;600;700&family=Nanum+Gothic+Coding&display=swap">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<div class="app">
  <aside class="side" id="side">
    <a class="brand" href="index.html"><small>소방학교 · 처음 시작하는 분들을 위한</small><strong>생성형 AI 입문</strong></a>
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

function pagerFor(i) {
  const a = (m, cls, label) => `<a class="${cls}" href="${m.page}"><span>${label}</span>${String(m.num).padStart(2, "0")} ${esc(m.short)}</a>`;
  return `<div class="pager">${i > 0 ? a(MODULES[i - 1], "prev", "← 이전") : '<a class="prev" href="index.html"><span>← 처음</span>처음 화면</a>'}${i < MODULES.length - 1 ? a(MODULES[i + 1], "next", "다음 →") : '<a class="next" href="prompts.html"><span>다음 →</span>프롬프트 모음</a>'}</div>`;
}

const render = (md) => enhance(marked.parse(wikify(studentMarkdown(md)), { gfm: true }));

// ── 만들기 ──
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ["assets", "files", "steps", "prototype"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "site.css"), path.join(OUT, "assets/site.css"));
fs.copyFileSync(path.join(import.meta.dirname, "site.js"), path.join(OUT, "assets/site.js"));

for (const [key, [dest, src]] of Object.entries(FILES)) {
  if (src) fs.copyFileSync(path.join(ROOT, src), path.join(OUT, dest));
}
// 스킬 ZIP: 폴더째 압축해야 Claude가 읽는다 (prd-interview/SKILL.md)
execFileSync("zip", ["-q", "-r", path.join(OUT, FILES.skill[0]), "prd-interview"], { cwd: path.join(LECTURE, "실습자료/스킬") });
execFileSync("zip", ["-q", "-r", path.join(OUT, FILES.quizzip[0]), "quiz-generator", "-x", "*/__pycache__/*"], { cwd: path.join(LECTURE, "실습자료/스킬") });

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

const promptsMd = fs.readFileSync(path.join(ROOT, FILES.prompts[1]), "utf8").replace(/^←.*\n/m, "");
fs.writeFileSync(path.join(OUT, "prompts.html"), page("prompts.html", "프롬프트 모음",
  `<p class="lead">수업에서 쓰는 프롬프트를 모았습니다. 상자 오른쪽 위 <b>[복사]</b>를 누르고 ChatGPT·Claude 입력창에 붙여넣으세요. </p><p class="lead"><a class="btn" href="${encodeURI(FILES.prompts[0])}" download="${FILES.prompts[2]}">프롬프트 모음 파일(.md) 내려받기</a> 옵시디언 <code>99_프롬프트</code> 폴더에 넣어 두면 수업 뒤에도 쓸 수 있습니다.</p>` + render(promptsMd)));

const allFiles = Object.entries(FILES).map(([k, [dest, , dl, label]]) => {
  const href = encodeURI(dest);
  const open = /\.(html|png)$/.test(href) ? ` <a class="btn ghost" href="${href}" target="_blank" rel="noopener">열어 보기</a>` : "";
  const used = Object.entries(MODULE_FILES).filter(([, ks]) => ks.includes(k)).map(([n]) => `모듈 ${String(n).padStart(2, "0")}`).join(", ");
  return `<tr id="${k === "skillmd" ? "skill" : k}"><td>${esc(label)}</td><td>${used}</td><td class="acts"><a class="btn" href="${href}" download="${esc(dl)}">내려받기</a>${open}</td></tr>`;
}).join("");
fs.writeFileSync(path.join(OUT, "files.html"), page("files.html", "실습 파일 내려받기",
  `<h1>실습 파일 내려받기</h1><p class="lead">내려받은 파일은 옵시디언 보관소(<code>문서 &gt; AI업무자료</code>)의 알맞은 폴더로 옮겨 두세요.</p>
  <div class="table-wrap"><table><thead><tr><th>파일</th><th>쓰는 모듈</th><th></th></tr></thead><tbody>${allFiles}</tbody></table></div>
  <h2>스킬 파일 내용 (SKILL.md)</h2><p>ZIP을 올릴 수 없는 경우, 아래 내용을 복사해 옵시디언 <code>98_스킬/prd-interview/SKILL</code> 노트에 붙여넣으세요.</p>
  <pre><code>${esc(fs.readFileSync(path.join(ROOT, FILES.skillmd[1]), "utf8"))}</code></pre>`));

const siteLinks = [
  ["Google 계정 만들기", "accounts.google.com/signup", "01"], ["ChatGPT", "chatgpt.com", "02"], ["Claude", "claude.ai", "02"],
  ["옵시디언 내려받기", "obsidian.md", "04"], ["Gemini Notebook", "notebooklm.google.com", "07"], ["GitHub", "github.com", "10"],
  ["Vercel", "vercel.com", "10"], ["Firebase 콘솔", "console.firebase.google.com", "11"], ["Claude Code", "claude.ai/code", "12"], ["Aside", "aside.com", "08"],
].sort((a, b) => a[2].localeCompare(b[2])).map(([label, host, mod]) => `<a class="tile" href="${SITES[host]}" target="_blank" rel="noopener"><b>${esc(label)}</b><span>${host}</span><small>모듈 ${mod}</small></a>`).join("");
const modItems = (list) => list.map((m) => `<li><a href="${m.page}"><span class="no">${String(m.num).padStart(2, "0")}</span><span class="t">${esc(m.short)}</span><span class="time">${m.time}</span></a></li>`).join("");
fs.writeFileSync(path.join(OUT, "index.html"), page("index.html", "처음 화면", `
  <h1>생성형 AI 입문</h1>
  <p class="lead">계정 만들기부터 프롬프트, 옵시디언, 스킬, PRD, 그리고 PRD로 만든 강의평가 집계 화면을 웹에 공개하고 AI 에이전트로 자동화하기까지 한 단계씩 따라 합니다.</p>
  <h2>사전 과제 · 수업 전에 각자</h2>
  <ol class="mods">${modItems(MODULES.slice(0, 2))}</ol>
  <p><a class="btn" href="prework.html">사전 과제 안내 보기</a> 첫날 전까지 해 올 것과 준비물을 한 장에 정리했습니다.</p>
  <h2>1일차 (1~6교시) · AI에게 일 시키기, PRD, 스킬, 보고 자료</h2>
  <ol class="mods">${modItems(MODULES.slice(2, 7))}</ol>
  <h2>2일차 (7~12교시) · 코딩 없이 자동화, 웹에 공개하기, 내 업무 화면 만들기</h2>
  <ol class="mods">${modItems([MODULES[7], MODULES[8], MODULES[9], MODULES[11]])}</ol>
  <p class="note">2일 연속, 총 12시간(하루 6교시, 1교시 = 50분 수업 + 10분 휴식)입니다. 1일차 저녁 과제와 과정 뒤 과제는 <a href="homework.html">과제 안내</a>에 있습니다. 모듈 11(Firebase)은 수업에서 다루지 않는 선택 자료입니다.</p>
  <h2>바로가기</h2>
  <div class="tiles">${siteLinks}</div>
  <h2>자료</h2>
  <p><a href="prompts.html">프롬프트 모음</a> · <a href="files.html">실습 파일 내려받기</a></p>
  <h2>준비물</h2>
  <ul><li><b>사전 과제</b>: 업무용 구글 계정, ChatGPT 가입, 업무 이메일 제출 → Claude Team 초대 수락, GitHub 가입 — <a href="prework.html">사전 과제 안내</a></li><li>본인 명의 휴대폰 (문자 인증, 배포한 강의평가 화면 확인용)</li><li>비밀번호를 적어 둘 수첩</li><li>내 업무 중 "AI로 도움받고 싶은 일" 한 가지</li></ul>
  <p class="note">체크박스 표시는 이 PC의 브라우저에만 저장됩니다.</p>`));

console.log("built", OUT, fs.readdirSync(OUT).length, "entries");
