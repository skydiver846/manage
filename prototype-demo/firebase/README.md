# Firebase 연결 완성본 (강사용)

모듈 08 수업 중 Claude가 만든 코드가 동작하지 않을 때 대신 쓰는 **완성본**입니다. 기능은 `prototype-demo/index.html`(PRD v0.3)과 같고, 기록만 브라우저 대신 **Firestore 공용 장부**에 저장합니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 출석부 완성본. Firebase는 공식 CDN(gstatic.com) 12.18.0 버전을 불러옴 |
| `firestore.rules` | 모듈 08 3단계 보안 규칙과 같은 내용 |
| `firebase.json` | 강사 PC에서 에뮬레이터로 시험할 때만 쓰는 설정 |

## 수업에서 쓰는 법

1. `index.html` 의 `firebaseConfig` 부분(▼▼▼ 표시)만 **내 Firebase 설정값**으로 바꿉니다.
2. Firestore 규칙 탭에 `firestore.rules` 내용이 **게시**되어 있는지 확인합니다.
3. GitHub 저장소의 `index.html` 을 이 내용으로 바꿔 커밋하면 Vercel이 자동 배포합니다.

설정값을 넣지 않고 열면 "설정 필요" 표시와 함께 입력칸이 잠깁니다. 이 화면으로 "설정값이 어디에 들어가는지"를 먼저 보여 줘도 좋습니다.

## 완성본이 PRD·규칙과 맞물리는 부분

| PRD / 규칙 | 코드 |
|---|---|
| 칸은 `name`, `no`, `date`, `time` 넷뿐 | `setDoc(ref, { name, no, date, time })` |
| 번호는 숫자 2자리 | 입력 `7` → `07` 로 맞춰 저장 |
| 중복 출석 차단 (수정 금지 규칙) | 문서 ID `날짜_번호_이름`. 이미 있으면 "이미 출석했습니다" |
| 동명이인은 번호로 구분 | 같은 이름 + 다른 번호는 다른 문서 |
| 모든 기기에서 같은 명단 | `onSnapshot` 으로 오늘 기록을 실시간 수신 |
| 삭제·초기화는 범위 밖 | 화면에 삭제 버튼 없음. 강사가 Firebase 콘솔에서 삭제 |

## 강사 PC에서 미리 시험하기 (선택)

실제 Firebase 프로젝트 없이 내 컴퓨터의 **에뮬레이터**로 확인할 수 있습니다. Node.js와 Java가 필요합니다.

```bash
cd prototype-demo/firebase
npx firebase-tools emulators:start --only firestore --project demo-attendance
# 다른 터미널에서
python -m http.server 8000
# 브라우저 두 개로 http://localhost:8000/?emulator 열기
```

주소 끝의 `?emulator` 가 있을 때만 에뮬레이터에 연결합니다. 실제 배포 주소에는 붙이지 않습니다.

## 검증한 것과 못 한 것

- ✅ Firestore 에뮬레이터 + 위 규칙으로 시험했습니다. 정상 출석과 명단 읽기는 허용되고, 중복 출석·수정·삭제·칸 추가·칸 누락·번호 1자리·이름 21자·다른 컬렉션 쓰기는 모두 거절됩니다.
- ✅ 브라우저 두 개로 한쪽에서 출석하면 다른 쪽에 새로고침 없이 나타나는 것, 중복 차단, 동명이인 출석, 입력 검사, 휴대폰 폭(400px)에서 가로 스크롤 없음, 설정 전 화면을 확인했습니다.
- ⚠️ 실제 Firebase 프로젝트(클라우드)와 gstatic CDN에서 직접 불러오는 것은 시험하지 못했습니다. 시험 환경에서는 같은 12.18.0 버전 파일을 npm에서 받아 대신 넣었습니다. 강의 전에 실제 프로젝트로 한 번 확인하세요.
