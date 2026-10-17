// POST /api/fire-quiz/submit  { quiz, name, answers: [원래 선택지 번호, …] }
// 생성형 AI 업무 활용 입문(fire-ai) 과정의 오늘의 퀴즈. AI 리터러시(/api/quiz)와 저장소는 같고 칸(PREFIX)만 다릅니다.
const { redis, readBody, send, fail } = require('../_lib/store');
const { keys, where } = require('../_lib/fire-quiz-key');
const PREFIX = 'fai';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '제출은 POST로만 받습니다.' });
  try {
    const { quiz, name, answers } = readBody(req);
    const key = keys[quiz];
    if (!key) return send(res, 400, { error: '알 수 없는 퀴즈입니다.' });

    const display = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!display) return send(res, 400, { error: '이름(또는 별명)을 입력해 주세요.' });
    const valid = Array.isArray(answers) && answers.length === key.length
      && answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3);
    if (!valid) return send(res, 400, { error: '모든 문항에 답한 뒤 제출해 주세요.' });

    const field = display.toLocaleLowerCase('ko');
    const hash = `${PREFIX}:sub:${quiz}`;
    const record = { name: display, answers, score: answers.filter((a, i) => a === key[i]).length, total: key.length, at: Date.now() };
    const [created] = await redis([['HSETNX', hash, field, JSON.stringify(record)]]);
    const saved = created ? record : JSON.parse((await redis([['HGET', hash, field]]))[0]);
    const correct = saved.answers.map((a, i) => a === key[i]);
    return send(res, 200, {
      already: !created, name: saved.name, score: saved.score, total: saved.total, correct,
      review: correct.map((ok, i) => (ok ? null : where[quiz][i]))
    });
  } catch (error) {
    return fail(res, error);
  }
};
