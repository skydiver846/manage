// GET /api/fire-survey/summary  누구나 볼 수 있는 수요조사 현황 (숫자만, 이름·소속·자유 응답은 내보내지 않음)
const { redis, toObject, send, fail } = require('../_lib/store');
const R = require('./_rules');

const STAFF = 42;   // 교직원 수 (응답률 계산)
const SEATS = 20;   // 차수별 정원

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET으로만 받습니다.' });
  try {
    const rows = Object.values(toObject((await redis([['HGETALL', R.HASH]]))[0])).map(v => JSON.parse(v));
    const count = (labels, list, get) => Object.fromEntries(Object.keys(labels).map(k =>
      [k, list.filter(r => { const v = get(r); return Array.isArray(v) ? v.includes(k) : v === k; }).length]));
    const want = rows.filter(r => r.intent !== 'no');
    const weekendNo = want.filter(r => r.cohort === 'none');
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 200, {
      ok: true, staff: STAFF, seats: SEATS, close: R.CLOSE, closed: R.closed(),
      n: rows.length, want: want.length,
      lastAt: rows.reduce((m, r) => Math.max(m, r.updatedAt || r.at || 0), 0),
      intents: count(R.INTENTS, rows, r => r.intent),
      can1: want.filter(r => r.cohort === '1' || r.cohort === 'both').length,
      can2: want.filter(r => r.cohort === '2' || r.cohort === 'both').length,
      weekendNo: weekendNo.length,
      modes: count(R.MODES, want, r => r.modes), modesWeekendNo: count(R.MODES, weekendNo, r => r.modes),
      days: count(R.DAYS, want, r => r.days), weeks: count(R.WEEKS, want, r => r.weeks),
      exps: count(R.EXPS, rows, r => r.exp),
      labels: { INTENTS: R.INTENTS, MODES: R.MODES, DAYS: R.DAYS, WEEKS: R.WEEKS, EXPS: R.EXPS }
    });
  } catch (error) {
    return fail(res, error);
  }
};
