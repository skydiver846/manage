#!/bin/bash
# 강의자료 → 교육생 사이트 빌드·배포 + 강사용 열람 페이지 다시 만들기
# 사용: tools/deploy.sh "커밋 메시지"
#   SITE_REPO  교육생 사이트 저장소 위치 (기본: 이 저장소 옆의 fire-ai-classroom)
#   SITE_MODE  preview = 처음 화면·교육 신청·사전 과제만 공개, full = 전체 공개
#              (기본: 한국 시간 OPEN_DAY 전이면 preview, 그날부터 full)
set -e
MSG="$1"; [ -n "$MSG" ] || { echo '사용: tools/deploy.sh "커밋 메시지"'; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_REPO="${SITE_REPO:-$ROOT/../fire-ai-classroom}"
git -C "$SITE_REPO" pull -q --rebase origin main   # 다른 과정(예: ai-literacy)이 먼저 올라가 있을 수 있음
cd "$ROOT"
NODE_PATH=$(npm root -g) node tools/classroom/build.mjs >/dev/null
git checkout classroom-site/files/prd-interview.zip 2>/dev/null || true
OPEN_DAY=20261030   # 10. 30. 전체 공개함 (이 날부터 기본이 full)
SITE_MODE="${SITE_MODE:-$( [ "$(TZ=Asia/Seoul date +%Y%m%d)" -lt "$OPEN_DAY" ] && echo preview || echo full )}"
if [ "$SITE_MODE" = preview ]; then
  SITE_MODE=preview NODE_PATH=$(npm root -g) node tools/classroom/build.mjs >/dev/null
  SRC=classroom-site-preview
else
  SRC=classroom-site
fi
echo "site-mode: $SITE_MODE"
rm -rf "$SITE_REPO/fire-ai" && mkdir -p "$SITE_REPO/fire-ai" && cp -r "$SRC/." "$SITE_REPO/fire-ai/"   # 지운 파일도 사이트에서 빠지도록 통째로 바꾼다
cp prototype-demo/network-check.html "$SITE_REPO/network-check.html"
mkdir -p "$SITE_REPO/api/fire-quiz" && cp tools/fire-quiz/api/fire-quiz/*.js "$SITE_REPO/api/fire-quiz/" && cp tools/fire-quiz/api/_lib/fire-quiz-key.js "$SITE_REPO/api/_lib/"   # 오늘의 퀴즈 서버 함수
mkdir -p "$SITE_REPO/api/fire-signup" && cp tools/fire-signup/api/fire-signup/*.js "$SITE_REPO/api/fire-signup/"   # 교육 신청 서버 함수
mkdir -p "$SITE_REPO/api/fire-survey" && cp tools/fire-survey/api/fire-survey/*.js "$SITE_REPO/api/fire-survey/"   # 사전 수요조사 서버 함수
git add -A lecture classroom-site tools prototype-demo
git commit -qm "$MSG" && git push -q -u origin "$(git branch --show-current)" && echo pushed-manage
cd "$SITE_REPO"
if [ -n "$(git status --porcelain)" ]; then git add -A && git commit -qm "$MSG" && git push -q origin main && echo pushed-site; else echo site-unchanged; fi
python3 "$ROOT/tools/viewer/build_viewer.py" | tail -1
