"""Build a single-page reader for the lecture materials (lecture/*.md + practice files)."""
import base64, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.environ.get("VIEWER_OUT", os.path.join(HERE, "out", "lecture-viewer.html"))
os.makedirs(os.path.dirname(OUT), exist_ok=True)

def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()

docs = []
def add(group, file, short):
    title = os.path.splitext(os.path.basename(file))[0]
    docs.append({"id": "d%02d" % len(docs), "group": group, "title": title, "short": short, "kind": "md", "body": read(file)})

L = "lecture/"
add("강의 개요", L + "00_강의 개요.md", "00 강의 개요")
add("강의 개요", L + "사전 과제 안내.md", "사전 과제 안내문")
add("강의 개요", L + "과제 안내.md", "과제 안내 (1일차 저녁 · 과정 뒤)")
add("강의 개요", L + "1기 피드백 문항.md", "1기 피드백 문항 (출구 카드·과정 평가)")
add("본 강의", L + "01_구글 업무 계정 만들기.md", "01 구글 업무 계정")
add("본 강의", L + "02_ChatGPT와 Claude 가입.md", "02 ChatGPT · Claude 가입")
add("본 강의", L + "03_프롬프트·파일·폴더 활용.md", "03 프롬프트 · 파일 · 폴더")
add("본 강의", L + "04_옵시디언 설치와 MD 파일 만들기.md", "04 옵시디언과 MD")
add("본 강의", L + "05_PRD 작성하기.md", "05 PRD 작성")
add("본 강의", L + "06_스킬 만들기.md", "06 스킬 만들기")
add("본 강의", L + "07_PRD로 결과물 만들기 (NotebookLM·생성형 AI).md", "07 PRD로 결과물 만들기")
add("본 강의", L + "08_AI 브라우저 Aside로 코딩 없이 업무 자동화.md", "08 AI 브라우저 Aside")
add("심화", L + "09_(심화) HTML·CSS·JavaScript로 강의평가 화면 뜯어보기.md", "09 HTML · CSS · JS")
add("심화", L + "10_(심화) 프로토타입 배포.md", "10 GitHub · Vercel 배포")
add("심화", L + "11_(심화) Firebase로 공용 장부 연결.md", "11 Firebase 공용 장부")
add("심화", L + "12_(심화) Claude Code로 한 번에 만들고 배포하기.md", "12 Claude Code")
add("실습자료", L + "실습자료/PRD_강의평가 결과보고.md", "PRD 강의평가 v0.1")
add("실습자료", L + "실습자료/PRD_강의평가 결과보고 (v0.3 완성본).md", "PRD 강의평가 v0.3 (정답)")
add("실습자료", L + "실습자료/강의평가_자유의견_예시.md", "자유의견 예시")
add("실습자료", L + "실습자료/문제출제_의뢰서_예시.md", "문제출제 의뢰서 (6-5)")
add("실습자료", L + "실습자료/교재발췌_연소와소화의기초.md", "교재 발췌 (6-5)")
add("실습자료", L + "실습자료/스킬/quiz-generator/SKILL.md", "quiz-generator SKILL.md")
add("실습자료", L + "실습자료/PRD 템플릿.md", "PRD 템플릿")
add("실습자료", L + "실습자료/프롬프트 모음.md", "프롬프트 모음")
add("실습자료", L + "실습자료/스킬/prd-interview/SKILL.md", "스킬 예시 SKILL.md")
docs[-1]["body"] = ("# 스킬 예시: prd-interview\n\n모듈 6 실습 파일입니다. 옵시디언 `98_스킬/prd-interview/` 폴더에 **SKILL** 이라는 노트를 만들고, "
    "아래 상자의 [복사] 버튼으로 **전체를** 복사해 붙여넣으세요. 맨 위 `---` 사이가 이름(name)과 설명(description)입니다.\n\n"
    "~~~~markdown\n" + docs[-1]["body"] + "\n~~~~\n")
add("강사용", "prototype-demo/firebase/README.md", "Firebase 완성본 안내")

def addfile(file, short, note, preview=True):
    docs.append({"id": "d%02d" % len(docs), "group": "실습 파일", "title": os.path.basename(file), "short": short,
                 "kind": "html", "path": file, "note": note, "preview": preview, "body": read(file)})

addfile("prototype-demo/steps/1-html.html", "1단계 HTML (뼈대)", "모듈 09 1단계. 색과 동작 없이 화면 구조만 있습니다.")
addfile("prototype-demo/steps/2-css.html", "2단계 CSS (옷)", "모듈 09 2단계. HTML은 그대로, 모양만 더했습니다.")
addfile("prototype-demo/steps/3-js.html", "3단계 JS (움직임)", "모듈 09 3단계. 평가를 내면 과목·교관별 평균이 계산됩니다. 새로고침하면 사라집니다.")
addfile("prototype-demo/index.html", "4단계 완성본 (v0.3)", "모듈 07·09의 완성본. 과목·교관별 집계, 3.5 미만 개선 필요, 브라우저 저장, 결과 내려받기.")
addfile("prototype-demo/firebase/index.html", "Firebase 완성본 (코드)", "모듈 11 강사용 완성본. 실제 Firebase 설정값이 필요해 이 페이지에서는 코드만 볼 수 있습니다.", preview=False)
addfile("prototype-demo/firebase/firestore.rules", "Firestore 규칙", "모듈 11 3단계 보안 규칙.", preview=False)
addfile("prototype-demo/network-check.html", "강의장 접속 점검 (코드)", "강의장 PC의 Chrome에서 열어야 정확합니다. 이 열람 페이지 안에서는 다른 사이트 접속이 막혀 있어 코드만 보여 줍니다.", preview=False)

qr = None

data = json.dumps({"docs": docs, "qr": qr}, ensure_ascii=False).replace("</", "<\\/")
html = open(os.path.join(HERE, "viewer_template.html"), encoding="utf-8").read()
open(OUT, "w", encoding="utf-8").write(html.replace("/*__DATA__*/null", data))
print(OUT, os.path.getsize(OUT), "bytes,", len(docs), "docs")
