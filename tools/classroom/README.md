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

## 처음 배포하기 (교육자료 전용 새 저장소)

1. **사이트 파일 받기**: 이 저장소의 `classroom-site` 폴더(또는 강사에게 전달된 `classroom-site.zip`)를 PC에 준비하고 압축을 풉니다.
2. **새 저장소 만들기**: GitHub → **[+] → New repository**
   - 이름: 예) `ai-class`
   - Public 또는 Private (Vercel 무료 요금제는 개인 계정의 Private 저장소도 배포 가능)
   - **Add a README file** 체크 → **[Create repository]**
3. **파일 올리기**: **[Add file] → [Upload files]** → `classroom-site` 폴더 **안의 내용 전부**(`index.html`, `m01.html`…, `assets`, `files`, `steps`, `prototype` 폴더)를 점선 상자에 끌어다 놓기 → Commit message `교육생용 강의 사이트` → **[Commit changes]**
   - ⚠️ `classroom-site` 폴더 자체가 아니라 **폴더 안의 내용**을 올립니다. 저장소 맨 위에 `index.html` 이 보여야 합니다.
4. **Vercel 연결**: Vercel → **[Add New…] → [Project]** → `ai-class` **[Import]** → 설정 그대로(Framework Preset: Other) → **[Deploy]**
5. **주소 확인**: 프로젝트 화면의 **Domains** 주소(예: `ai-class-xxxx.vercel.app`)를 열어 처음 화면이 나오면 완료
6. **강의 플랫폼에 링크**: 이 Domains 주소를 강의 플랫폼에 걸어 둡니다

> 행정망 강의장 PC에서 Vercel 주소가 열리는 것은 오전 리허설에서 확인했습니다. 강의 전에 강의장 PC로 위 주소를 한 번 열어 **내려받기 버튼**까지 눌러 보세요.

## 강의자료를 고친 뒤 다시 만들기

```bash
cd tools/classroom
npm install        # 처음 한 번
npm run build      # lecture/*.md → classroom-site/ 다시 생성
```

다시 만든 `classroom-site` 폴더 안의 내용을 새 저장소에 **같은 방법으로 다시 올리면**(같은 이름 파일은 덮어쓰기) Vercel이 자동으로 다시 배포합니다. 주소는 바뀌지 않습니다.

## 교육생판에서 거르는 규칙 (build.mjs)

- 인용 상자(`>`) 안에 `🧑‍🏫`, `강사`, `리허설` 이 있으면 상자째 뺍니다.
- `## ` 소제목에 `수업 전`, `강사`, `완성본` 이 있으면 그 소제목 아래 내용을 뺍니다.
- `(정답: …)`, `(리허설…)`, `✅ 리허설 완료` 는 지웁니다.
- 강사용 자료(PRD v0.3 정답)로 가는 줄은 뺍니다.

강사 노트를 새로 쓸 때 위 낱말을 넣으면 교육생판에서 자동으로 빠집니다.
