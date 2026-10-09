# tools

| 폴더·파일 | 하는 일 | 실행 |
|---|---|---|
| `classroom/` | `lecture/*.md` → 교육생 사이트(`classroom-site/`) | `NODE_PATH=$(npm root -g) node tools/classroom/build.mjs` (자세한 내용은 `classroom/README.md`) |
| `deploy.sh` | 사이트 빌드 → `fire-ai-classroom/fire-ai/` 복사 → 두 저장소 커밋·푸시 → 강사용 열람 페이지 다시 만들기 | `tools/deploy.sh "커밋 메시지"` |
| `viewer/` | 강의자료 전체(강사 노트·정답 포함)를 한 페이지로 묶은 **강사용 열람 페이지** | `python3 tools/viewer/build_viewer.py` → `tools/viewer/out/lecture-viewer.html` |
| `report/` | 계획 보고서(hwpx) 채우기. 문구 바꾸기 목록 + 붙임 시간표(`annex.py`) | 원본 양식을 `tools/report/src.hwpx`로 두고 `python3 tools/report/fill_report.py` |
| `rehearsal/` | 리허설 기록 페이지 원본 (claude.ai 아티팩트로 게시, 기록은 아티팩트 저장소에 보관) | 브라우저로 열면 기록은 그 브라우저에만 저장 |

- 강사용 열람 페이지와 보고서 결과물은 정답·강사 노트·기관 문서가 들어 있어 저장소에 올리지 않습니다(`.gitignore`).
- `deploy.sh`는 지운 파일을 사이트 저장소에서 지우지 않습니다. 파일을 없앴으면 `fire-ai-classroom`에서 `git rm` 하세요.
- 시간표를 바꾸면 `lecture/00_강의 개요.md`와 함께 `report/annex.py`, `rehearsal/rehearsal-log.html`의 교시 목록도 고칩니다.
