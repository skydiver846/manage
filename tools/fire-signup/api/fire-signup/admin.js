// POST /api/fire-signup/admin  { key, action, email? }  강사 전용 (Vercel 환경 변수 QUIZ_ADMIN_KEY, 오늘의 퀴즈와 같은 값)
// action: list | delete-one | delete-all
const { redis, toObject, readBody, send, fail } = require('../_lib/store');
const { HASH, CLOSE, COHORTS, EXPS, normEmail } = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST로만 받습니다.' });
  const adminKey = process.env.QUIZ_ADMIN_KEY;
  if (!adminKey) return send(res, 503, { error: '관리 비밀번호(QUIZ_ADMIN_KEY)가 아직 설정되지 않았습니다.' });
  try {
    const { key, action, email } = readBody(req);
    if (String(key || '') !== adminKey) return send(res, 401, { error: '관리 비밀번호가 맞지 않습니다.' });
    if (action === 'list') {
      const rows = Object.values(toObject((await redis([['HGETALL', HASH]]))[0]))
        .map(v => JSON.parse(v))
        .map(r => ({ ...r, cohortLabel: COHORTS[r.cohort], expLabel: EXPS[r.exp] }))
        .sort((a, b) => a.at - b.at);
      return send(res, 200, { ok: true, close: CLOSE, rows });
    }
    if (action === 'delete-one') { await redis([['HDEL', HASH, normEmail(email)]]); return send(res, 200, { ok: true }); }
    if (action === 'delete-all') { await redis([['DEL', HASH]]); return send(res, 200, { ok: true }); }
    return send(res, 400, { error: '알 수 없는 작업입니다.' });
  } catch (error) {
    return fail(res, error);
  }
};
