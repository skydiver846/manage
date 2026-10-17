// GET /api/fire-quiz/board  결과 공유판: 제출 인원, 문항별 정답률·선택 분포, (강사가 공개하면) 정답. 개인 점수와 순위는 돌려주지 않습니다.
const { redis, toObject, send, fail } = require('../_lib/store');
const { keys } = require('../_lib/fire-quiz-key');
const PREFIX = 'fai';
const QUIZ_IDS = Object.keys(keys);

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET으로만 조회합니다.' });
  try {
    const results = await redis([...QUIZ_IDS.map(id => ['HGETALL', `${PREFIX}:sub:${id}`]), ['HGETALL', `${PREFIX}:flags`]]);
    const flags = toObject(results.pop());
    const showAnswers = flags.answers === '1';
    const quizzes = {};
    QUIZ_IDS.forEach((id, qi) => {
      const subs = Object.values(toObject(results[qi])).map(text => JSON.parse(text));
      const counts = keys[id].map(() => [0, 0, 0, 0]);
      subs.forEach(sub => sub.answers.forEach((a, i) => { counts[i][a] += 1; }));
      quizzes[id] = {
        submitted: subs.length,
        questions: counts.map((c, i) => ({
          counts: c,
          correctRate: subs.length ? Math.round((c[keys[id][i]] / subs.length) * 100) : null,
          answer: showAnswers ? keys[id][i] : null
        }))
      };
    });
    return send(res, 200, { quizIds: QUIZ_IDS, quizzes, showAnswers, updatedAt: Date.now() });
  } catch (error) {
    return fail(res, error);
  }
};
