# 교육생용 강의 사이트 (classroom-site)

`lecture/*.md` 강의자료로 만드는 **교육생용 웹사이트**입니다. 강의 플랫폼에는 이 사이트 주소 하나만 링크합니다.

| | 강사판 (`lecture/`, 열람용 페이지) | 교육생판 (`classroom-site/`) |
|---|---|---|
| 강사 노트 (🧑‍🏫), 리허설 메모 | 있음 | **없음** |
| 수업 전 준비, 완성본 안내 같은 소제목 | 있음 | **없음** |
| 확인 질문의 정답 | 있음 | **숨김** |
| PRD v0.3 정답, Firebase 완성본, 접속 점검 페이지 | 있음 | **없음** |
| 사이트 주소 (`chatgpt.com` 등) | 글자 | **클릭하면 새 탭으로 열리는 링크** |
| 프롬프트 | 글 | **[복사] 버튼** |
| 실습 파일 | "공유 링크로 배포" | **모듈마다 [내려받기] 버튼**, 실습 파일 모음 페이지 |

외부 프로그램(CDN) 없이 열리는 완성된 HTML이라 행정망에서도 동작합니다. 웹 글꼴(Google Fonts)이 막히면 Windows 기본 글꼴(맑은 고딕)로 보입니다.

## 배포 위치: `skydiver846/fire-ai-classroom`

교육생 사이트는 **`fire-ai-classroom` 저장소 하나**에 강의별 폴더로 올립니다. 이 저장소는 Vercel에 연결되어 `main` 에 올리면 자동 배포됩니다.

```
fire-ai-classroom
 ├─ index.html          ← 강의 목록 첫 화면
 ├─ fire-ai/            ← 이 강의 (classroom-site 내용 그대로)
 └─ network-check.html  ← 강사용 강의장 접속 점검 (목록에 링크하지 않음)
```

- 교육생 주소: `https://fire-ai-classroom.vercel.app/fire-ai/` — 강의 플랫폼에는 이 주소를 링크합니다
- 강의장 점검: `https://fire-ai-classroom.vercel.app/network-check.html`
- 새 강의는 폴더 하나와 `index.html` 카드 하나만 추가합니다. 저장소·Vercel 프로젝트를 새로 만들지 않습니다.

### 처음 한 번: Vercel 연결

Vercel → **[Add New…] → [Project]** → `fire-ai-classroom` **[Import]** → 설정 그대로(Framework Preset: Other) → **[Deploy]** → **Domains** 주소 확인

> 행정망 강의장 PC에서 Vercel 주소가 열리는 것은 오전 리허설에서 확인했습니다. 강의 전에 강의장 PC로 위 주소를 한 번 열어 **내려받기 버튼**까지 눌러 보세요.

## 강의자료를 고친 뒤 다시 올리기

```bash
cd tools/classroom
npm install        # 처음 한 번
npm run build      # lecture/*.md → classroom-site/ 다시 생성
rsync -a --delete ../../classroom-site/ ../../../fire-ai-classroom/fire-ai/
cd ../../../fire-ai-classroom && git add -A && git commit -m "강의자료 갱신" && git push
```

웹으로 할 때는 `fire-ai-classroom` 저장소의 `fire-ai` 폴더에서 **[Add file] → [Upload files]** 로 `classroom-site` 안의 내용을 끌어다 놓습니다(같은 이름은 덮어쓰기, 없어진 파일은 직접 삭제). 주소는 바뀌지 않습니다.

## 교육생판에서 거르는 규칙 (build.mjs)

- 인용 상자(`>`) 안에 `🧑‍🏫`, `강사`, `리허설` 이 있으면 상자째 뺍니다.
- `## ` 소제목에 `수업 전`, `강사`, `완성본` 이 있으면 그 소제목 아래 내용을 뺍니다.
- `(정답: …)`, `(리허설…)`, `✅ 리허설 완료` 는 지웁니다.
- 강사용 자료(PRD v0.3 정답)로 가는 줄은 뺍니다.

강사 노트를 새로 쓸 때 위 낱말을 넣으면 교육생판에서 자동으로 빠집니다.
