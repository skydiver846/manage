// POST /api/fire-signup/submit  { name, dept, rank, cohort, exp, email, agreePrivacy, agreeTeam }
// 생성형 AI 활용능력 향상교육 신청. 같은 구글 계정으로 다시 내면 앞의 신청을 고칩니다.
const { redis, readBody, send, fail } = require('../_lib/store');
const { HASH, MAX, COHORTS, EXPS, clean, normEmail, isEmail, closed } = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '신청은 POST로만 받습니다.' });
  if (closed()) return send(res, 403, { error: '신청 기간이 끝났습니다. 교수부 조영진(☎ 4984)에게 문의해 주세요.' });
  try {
    const b = readBody(req);
    const record = {
      name: clean(b.name, 20), dept: clean(b.dept, 30), rank: clean(b.rank, 15),
      cohort: String(b.cohort || ''), exp: String(b.exp || ''), email: normEmail(b.email)
    };
    if (!record.name || !record.dept || !record.rank) return send(res, 400, { error: '성명, 소속, 직급을 모두 적어 주세요.' });
    if (!COHORTS[record.cohort]) return send(res, 400, { error: '희망 차수를 골라 주세요.' });
    if (!EXPS[record.exp]) return send(res, 400, { error: 'AI 사용 경험을 골라 주세요.' });
    if (!isEmail(record.email)) return send(res, 400, { error: '구글 계정(이메일) 주소를 다시 확인해 주세요.' });
    if (b.agreePrivacy !== true) return send(res, 400, { error: '개인정보 수집·이용에 동의해야 신청할 수 있습니다.' });
    if (b.agreeTeam !== true) return send(res, 400, { error: '소속 팀장과 교육 일정을 협의한 뒤 신청해 주세요.' });

    const [old, count] = await redis([['HGET', HASH, record.email], ['HLEN', HASH]]);
    if (!old && count >= MAX) return send(res, 429, { error: '신청이 너무 많이 들어왔습니다. 교수부 조영진(☎ 4984)에게 문의해 주세요.' });
    const prev = old ? JSON.parse(old) : null;
    const now = Date.now();
    const saved = { ...record, at: prev ? prev.at : now, updatedAt: now };
    await redis([['HSET', HASH, record.email, JSON.stringify(saved)]]);
    return send(res, 200, { ok: true, updated: Boolean(prev), cohort: COHORTS[saved.cohort], name: saved.name, email: saved.email });
  } catch (error) {
    return fail(res, error);
  }
};
