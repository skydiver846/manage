#!/bin/bash
# 강의자료 → 교육생 사이트 빌드·배포 + 강사용 열람 페이지 다시 만들기
# 사용: tools/deploy.sh "커밋 메시지"
#   SITE_REPO  교육생 사이트 저장소 위치 (기본: 이 저장소 옆의 fire-ai-classroom)
set -e
MSG="$1"; [ -n "$MSG" ] || { echo '사용: tools/deploy.sh "커밋 메시지"'; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_REPO="${SITE_REPO:-$ROOT/../fire-ai-classroom}"
cd "$ROOT"
NODE_PATH=$(npm root -g) node tools/classroom/build.mjs >/dev/null
git checkout classroom-site/files/prd-interview.zip classroom-site/files/quiz-generator.zip 2>/dev/null || true
cp -r classroom-site/. "$SITE_REPO/fire-ai/"
cp prototype-demo/network-check.html "$SITE_REPO/network-check.html"
git add -A lecture classroom-site tools prototype-demo
git commit -qm "$MSG" && git push -q -u origin "$(git branch --show-current)" && echo pushed-manage
cd "$SITE_REPO"
if [ -n "$(git status --porcelain)" ]; then git add -A && git commit -qm "$MSG" && git push -q origin main && echo pushed-site; else echo site-unchanged; fi
python3 "$ROOT/tools/viewer/build_viewer.py" | tail -1
