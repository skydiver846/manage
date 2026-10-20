// POST /api/fire-survey/submit  { name, dept, rank, intent, cohort, modes[], modeEtc, days[], weeks[], exp, tools[], toolEtc, wish, agree }
// 생성형 AI 활용능력 향상교육 사전 수요조사. 같은 소속·성명으로 다시 내면 앞의 응답을 고칩니다.
const { redis, readBody, send, fail } = require('../_lib/store');
const R = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '응답은 POST로만 받습니다.' });
  if (R.closed()) return send(res, 403, { error: '수요조사 기간이 끝났습니다. 교수부 조영진(☎ 4984)에게 문의해 주세요.' });
  try {
    const b = readBody(req);
    const record = {
      name: R.clean(b.name, 20), dept: R.clean(b.dept, 30), rank: R.clean(b.rank, 15),
      intent: String(b.intent || ''), cohort: String(b.cohort || ''),
      modes: R.pick(b.modes, R.MODES), modeEtc: R.clean(b.modeEtc, 60),
      days: R.pick(b.days, R.DAYS), weeks: R.pick(b.weeks, R.WEEKS),
      exp: String(b.exp || ''), tools: R.pick(b.tools, R.TOOLS), toolEtc: R.clean(b.toolEtc, 40),
      wish: R.clean(b.wish, 300)
    };
    if (!record.name || !record.dept || !record.rank) return send(res, 400, { error: '성명, 소속, 직급을 모두 적어 주세요.' });
    if (!R.INTENTS[record.intent]) return send(res, 400, { error: '1번 참여 의향을 골라 주세요.' });
    if (!R.COHORTS[record.cohort]) return send(res, 400, { error: '2번 가능한 차수를 골라 주세요.' });
    if (!R.EXPS[record.exp]) return send(res, 400, { error: '5번 AI 사용 경험을 골라 주세요.' });
    if (b.agree !== true) return send(res, 400, { error: '개인정보 수집·이용에 동의해야 응답할 수 있습니다.' });

    const key = R.keyOf(record.dept, record.name);
    const [old, count] = await redis([['HGET', R.HASH, key], ['HLEN', R.HASH]]);
    if (!old && count >= R.MAX) return send(res, 429, { error: '응답이 너무 많이 들어왔습니다. 교수부 조영진(☎ 4984)에게 문의해 주세요.' });
    const prev = old ? JSON.parse(old) : null;
    const now = Date.now();
    await redis([['HSET', R.HASH, key, JSON.stringify({ ...record, at: prev ? prev.at : now, updatedAt: now })]]);
    return send(res, 200, { ok: true, updated: Boolean(prev), name: record.name });
  } catch (error) {
    return fail(res, error);
  }
};
