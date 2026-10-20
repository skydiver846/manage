// POST /api/fire-survey/admin  { key, action, id? }  강사 전용 (Vercel 환경 변수 QUIZ_ADMIN_KEY, 오늘의 퀴즈와 같은 값)
// action: list | delete-one | delete-all
const { redis, toObject, readBody, send, fail } = require('../_lib/store');
const R = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST로만 받습니다.' });
  const adminKey = process.env.QUIZ_ADMIN_KEY;
  if (!adminKey) return send(res, 503, { error: '관리 비밀번호(QUIZ_ADMIN_KEY)가 아직 설정되지 않았습니다.' });
  try {
    const { key, action, id } = readBody(req);
    if (String(key || '') !== adminKey) return send(res, 401, { error: '관리 비밀번호가 맞지 않습니다.' });
    if (action === 'list') {
      const rows = Object.entries(toObject((await redis([['HGETALL', R.HASH]]))[0]))
        .map(([k, v]) => ({ id: k, ...JSON.parse(v) }))
        .sort((a, b) => a.at - b.at);
      const labels = { INTENTS: R.INTENTS, COHORTS: R.COHORTS, MODES: R.MODES, DAYS: R.DAYS, WEEKS: R.WEEKS, EXPS: R.EXPS, TOOLS: R.TOOLS };
      return send(res, 200, { ok: true, close: R.CLOSE, rows, labels });
    }
    if (action === 'delete-one') { await redis([['HDEL', R.HASH, String(id || '')]]); return send(res, 200, { ok: true }); }
    if (action === 'delete-all') { await redis([['DEL', R.HASH]]); return send(res, 200, { ok: true }); }
    return send(res, 400, { error: '알 수 없는 작업입니다.' });
  } catch (error) {
    return fail(res, error);
  }
};
