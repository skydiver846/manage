// 교육 신청 공통 규칙. 서버 함수 세 개(submit, lookup, admin)가 함께 씁니다.
const PREFIX = 'fai';
const HASH = `${PREFIX}:signup`;
// 신청 마감. 늦추려면 Vercel 환경 변수 SIGNUP_CLOSE 에 같은 형식으로 넣습니다.
const CLOSE = process.env.SIGNUP_CLOSE || '2026-10-28T18:00:00+09:00';
// 사전 수요조사 기간에는 신청을 받지 않는다. 계획이 확정되면 false로 바꾸고 배포 (사이트 쪽은 build.mjs 의 SIGNUP_OPEN)
const PAUSED = true;
const MAX = 300;   // 저장 건수 상한 (장난 제출 방지)
const COHORTS = { '1': '1차', '2': '2차', any: '어느 차수든' };
const EXPS = { none: '없음', few: '몇 번', some: '가끔', often: '자주' };

const clean = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n);
const normEmail = v => String(v || '').trim().toLowerCase();
const isEmail = v => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 100;
const closed = () => Date.now() > Date.parse(CLOSE);

module.exports = { HASH, CLOSE, PAUSED, MAX, COHORTS, EXPS, clean, normEmail, isEmail, closed };
