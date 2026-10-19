// POST /api/fire-signup/lookup  { email, name, action: 'check' | 'cancel' }
// 본인 신청 확인·취소. 구글 계정과 성명이 둘 다 맞아야 합니다.
const { redis, readBody, send, fail } = require('../_lib/store');
const { HASH, COHORTS, EXPS, clean, normEmail } = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST로만 받습니다.' });
  try {
    const b = readBody(req);
    const email = normEmail(b.email), name = clean(b.name, 20);
    const [raw] = await redis([['HGET', HASH, email]]);
    const rec = raw ? JSON.parse(raw) : null;
    if (!rec || rec.name !== name) return send(res, 404, { error: '이 구글 계정과 성명으로 된 신청이 없습니다.' });
    if (b.action === 'cancel') {
      await redis([['HDEL', HASH, email]]);
      return send(res, 200, { ok: true, cancelled: true });
    }
    return send(res, 200, { ok: true, name: rec.name, dept: rec.dept, rank: rec.rank, cohort: COHORTS[rec.cohort], exp: EXPS[rec.exp], at: rec.at });
  } catch (error) {
    return fail(res, error);
  }
};
