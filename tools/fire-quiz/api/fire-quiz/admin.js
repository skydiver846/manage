// POST /api/fire-quiz/admin  { key, action }  강사 전용 (Vercel 환경 변수 QUIZ_ADMIN_KEY, AI 리터러시와 같은 값)
// action: check | show-answers | hide-answers | reset
const { redis, readBody, send, fail } = require('../_lib/store');
const { keys } = require('../_lib/fire-quiz-key');
const PREFIX = 'fai';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST로만 받습니다.' });
  const adminKey = process.env.QUIZ_ADMIN_KEY;
  if (!adminKey) return send(res, 503, { error: '관리 비밀번호(QUIZ_ADMIN_KEY)가 아직 설정되지 않았습니다.' });
  try {
    const { key, action } = readBody(req);
    if (String(key || '') !== adminKey) return send(res, 401, { error: '관리 비밀번호가 맞지 않습니다.' });
    const flags = `${PREFIX}:flags`;
    const commands = {
      check: null,
      'show-answers': [['HSET', flags, 'answers', '1']],
      'hide-answers': [['HDEL', flags, 'answers']],
      reset: [['DEL', flags, ...Object.keys(keys).map(id => `${PREFIX}:sub:${id}`)]]
    };
    if (!(action in commands)) return send(res, 400, { error: '알 수 없는 작업입니다.' });
    if (commands[action]) await redis(commands[action]);
    return send(res, 200, { ok: true, action });
  } catch (error) {
    return fail(res, error);
  }
};
