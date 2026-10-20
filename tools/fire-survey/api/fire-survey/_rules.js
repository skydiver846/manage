// 사전 수요조사 공통 규칙. 서버 함수 두 개(submit, admin)가 함께 씁니다.
const PREFIX = 'fai';
const HASH = `${PREFIX}:survey`;
// 조사 마감. 늦추려면 Vercel 환경 변수 SURVEY_CLOSE 에 같은 형식으로 넣습니다.
const CLOSE = process.env.SURVEY_CLOSE || '2026-10-23T18:00:00+09:00';
const MAX = 200;   // 저장 건수 상한 (교직원 42명, 장난 제출 방지)
const INTENTS = { yes: '꼭 참여', maybe: '일정이 맞으면', no: '어려움' };
const COHORTS = { '1': '1차', '2': '2차', both: '둘 다', none: '둘 다 어려움' };
const MODES = { a: '이틀: 퇴근 무렵+다음 날 오전', b: '이틀: 근무시간 중 5시간', c: '나흘: 하루 2시간 30분', etc: '기타' };
const DAYS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };
const WEEKS = { w2: '11월 2주', w3: '11월 3주', w4: '11월 4주', d1: '12월 1주' };
const EXPS = { none: '없음', few: '몇 번', some: '가끔', often: '자주' };
const TOOLS = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', wrtn: '뤼튼', etc: '기타', none: '없음' };

const clean = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n);
const pick = (v, allowed) => [...new Set(Array.isArray(v) ? v.map(String) : [])].filter(x => allowed[x]);
const keyOf = (dept, name) => `${dept}|${name}`.replace(/\s+/g, '').toLowerCase();
const closed = () => Date.now() > Date.parse(CLOSE);

module.exports = { HASH, CLOSE, MAX, INTENTS, COHORTS, MODES, DAYS, WEEKS, EXPS, TOOLS, clean, pick, keyOf, closed };
