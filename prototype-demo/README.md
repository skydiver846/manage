# 강의평가 결과 집계 (강의용 프로토타입)

빌드 도구 없이 HTML 파일 하나로 동작하는 강의평가 집계 프로토타입입니다. 과목·교관별 응답 수와 평균을 내고, 평균 3.5 미만은 "개선 필요"로 표시합니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 완성본 (PRD v0.3 + 모듈 11의 "결과 내려받기") |
| `steps/1-html.html` ~ `3-js.html` | 모듈 08의 HTML → CSS → JavaScript 단계별 파일 |
| `firebase/` | 모듈 10 공용 장부(Firestore) 완성본과 보안 규칙 |
| `network-check.html` | 강의장 PC 접속 점검 페이지 |

## 로컬에서 실행

```bash
cd prototype-demo
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```
