---
tags: [기획, 출석체크시스템, firebase, 백엔드]
created: 2026-08-25
related: "[[소방학교 출석체크 시스템 기획 방향]]"
---

# 소방학교 출석관리시스템 — Firebase 연동 가이드

> 전제: 현재 `소방학교 출석관리시스템.dc.html`은 Claude Design 캔버스의 **프로토타입**입니다. CDN에서 React/Babel을 즉석 로드하고 `eval`로 로직을 실행하는 방식이라 **UX/데이터 구조 검증용**이지 그대로 프로덕션에 배포할 코드가 아닙니다. 이 문서는 "프로토타입에서 검증된 화면·상태·데이터 모양"을 그대로 실제 React(또는 Next.js) 앱 + Firebase 백엔드로 옮기는 방법을 다룹니다.

## 0. 시작 전에 — 공공기관 클라우드 규정부터 확인 (가장 중요)

소방학교는 공공기관이므로 실제 서비스로 전환하기 전에 **반드시** 아래를 정보보안 담당부서와 확인하세요.

- 행정·공공기관이 클라우드컴퓨팅서비스(Firebase는 Google Cloud 기반)를 이용하려면 **CSAP(클라우드보안인증)**을 받은 서비스여야 합니다. 2023년부터 데이터 등급제(상/중/하)가 도입되어 등급이 낮은 정보는 해외 CSP(AWS/Azure/GCP 등)의 국제인증 등급으로도 허용될 여지가 생겼지만, **개인정보(교육생 인적사항, 진단서 등 민감정보)를 다루는 이 시스템은 등급이 높게 분류될 가능성**이 큽니다.
- 결론적으로 Firebase(Google)는 국내 공공기관 표준 클라우드 이용 절차상 **바로 쓰기 어려울 수 있습니다.** 실제 운영 전환 시 다음 중 하나를 검토하세요.
  - 네이버클라우드플랫폼(NCP), KT Cloud, NHN Cloud 등 **CSAP 인증받은 국내 클라우드** + Firebase와 유사한 서비스 조합(예: NCP의 Auth/DB/Functions 서비스)로 재구성
  - 나라장터 SaaS/국가정보자원관리원(G-Cloud) 이용
  - Firebase는 **개발/파일럿(1단계) 검증 단계**에서만 쓰고, 정식 운영 전환 시 아키텍처를 CSAP 인증 환경으로 이전
- 이 문서의 내용은 **기술적으로 어떻게 붙이는지**에 집중합니다. 정식 운영 여부는 반드시 위 절차를 먼저 통과시키세요.

---

## 1. 전체 아키텍처

```
[React/Next.js 프론트엔드] ──Firebase SDK──> [Firebase Authentication]  (로그인, 역할 Custom Claims)
                          ├──Firebase SDK──> [Cloud Firestore]          (모든 데이터: 과정/출결/정정/보고서/로그)
                          ├──Firebase SDK──> [Cloud Storage]            (증빙파일, 첨부파일)
                          ├──callable/HTTPS──> [Cloud Functions]        (지각·조퇴 판정, 확정 잠금, 결석환산, 통계, 알림)
                          └──Firebase SDK──> [Cloud Messaging / 확장앱]  (푸시·문자 알림)
[Firebase Hosting] 프론트엔드 정적 빌드 배포
[Cloud Scheduler] 마감시간 체크(18:00 미확정 알림), 야간 배치(통계 집계)
```

핵심 원칙: **클라이언트는 절대 출결 데이터를 직접 "확정" 상태로 쓰지 않습니다.** 확정·정정승인·계정발급처럼 신뢰가 중요한 쓰기는 반드시 **Cloud Functions(callable function)**를 거치게 하고, Firestore 보안 규칙에서 클라이언트의 직접 쓰기를 제한합니다. (이게 [[소방학교 출석체크 시스템 기획 방향]]에서 정한 "교육생 셀프체크 → 교관 확정" 2단계 신뢰 구조를 실제로 강제하는 방법입니다.)

---

## 2. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속 → "프로젝트 추가"
2. 프로젝트명 예: `fireacademy-attendance`
3. Google Analytics는 불필요(내부 행정시스템이므로 끔)
4. 콘솔에서 활성화할 서비스
   - **Authentication** → 이메일/비밀번호, 필요 시 전화번호(SMS OTP) 로그인 활성화
   - **Firestore Database** → 프로덕션 모드로 생성, 리전은 `asia-northeast3`(서울) 선택
   - **Storage** → 서울 리전
   - **Functions** → Blaze(종량제) 플랜 필요 (외부 API 호출·예약 함수는 무료 플랜(Spark)에서 불가)
   - **Hosting**
5. 웹 앱 등록 (</> 아이콘) → `firebaseConfig` 객체 복사

```bash
npm install -g firebase-tools
firebase login
firebase init
# 선택: Firestore, Functions, Hosting, Storage, Emulators
```

```js
// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast3");
```

### 2.1 firebaseConfig를 `.env`로 분리하기

`firebaseConfig`의 값(apiKey, authDomain 등)은 클라이언트 번들에 그대로 노출되는 값이라 **비밀키가 아닙니다.** 그래도 dev/운영 프로젝트를 분리하거나 실수로 값이 섞이는 걸 막으려면 `.env`로 빼두는 게 좋습니다. 접두사 규칙은 빌드 도구마다 다릅니다 — 접두사가 없으면 값이 번들에 아예 포함되지 않으니 주의하세요.

**Vite** (변수명 앞에 `VITE_` 필수):

```bash
# .env.local — 로컬 전용, 절대 git에 커밋하지 않음
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=fireacademy-attendance.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fireacademy-attendance
VITE_FIREBASE_STORAGE_BUCKET=fireacademy-attendance.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Next.js** (클라이언트에서 읽을 값은 `NEXT_PUBLIC_` 필수):

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fireacademy-attendance.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fireacademy-attendance
```
```js
apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
```

**Create React App** (`REACT_APP_` 필수):

```bash
# .env.local
REACT_APP_FIREBASE_API_KEY=AIzaSy...
```
```js
apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
```

**환경별 파일 분리** — Vite/CRA/Next.js 모두 아래 규칙을 따릅니다.

| 파일명 | 용도 |
|---|---|
| `.env` | 모든 환경 공통 기본값 (커밋 가능, 민감값 넣지 않기) |
| `.env.local` | 로컬 개발자 개인 설정 — **항상 gitignore** |
| `.env.development` | `npm run dev` 실행 시 |
| `.env.production` | `npm run build` 실행 시 |

파일럿(개발용 Firebase 프로젝트)과 정식 운영(별도 Firebase 프로젝트)을 분리하고 싶다면 `.env.development`엔 개발 프로젝트의 config를, `.env.production`엔 운영 프로젝트의 config를 넣으면 빌드 시 자동으로 맞는 값이 선택됩니다.

**`.gitignore`에 반드시 추가**:

```gitignore
.env
.env.local
.env.*.local
```

**진짜 비밀키는 절대 프론트 `.env`에 넣지 않기** — Admin SDK 서비스 계정 키(JSON), 서버용 API 시크릿 등은 `VITE_`/`NEXT_PUBLIC_` 접두사가 붙는 순간 클라이언트 번들에 그대로 노출됩니다. 그런 값은 Cloud Functions 환경변수(`firebase functions:config:set` 또는 `.env`를 `functions/` 디렉터리 안에 별도로 두는 방식, 2nd gen에서는 `defineSecret`)로만 관리하세요.

**apiKey가 노출돼도 안전하려면**: Firebase Console → 프로젝트 설정 → API 키 제한에서 HTTP 리퍼러(도메인) 제한을 걸고, Firestore/Storage 보안 규칙(5·7절)을 제대로 설정해두는 것이 실제 보안의 핵심입니다. `.env`로 숨기는 건 "값 관리 편의"이지 "보안 조치"가 아님을 기억하세요.

// 옥외훈련장 등 오프라인 상황 대응 — 4.2/4.3 오프라인 이슈의 핵심 해결책
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("여러 탭이 열려 있어 오프라인 지속성은 한 탭에서만 활성화됩니다.");
  }
});
```

`enableIndexedDbPersistence`를 켜두면 Firestore SDK가 **자동으로** 오프라인 상태에서의 읽기/쓰기를 로컬 큐에 쌓아뒀다가 네트워크가 복구되면 서버에 동기화합니다. sitemap의 `/sysadmin/offline-sync`가 하려던 일(옥외훈련장 QR 스캔 → 재연결 시 자동 반영)을 Firestore가 상당 부분 기본 제공한다는 뜻입니다. 다만 **동시 쓰기 충돌(같은 문서를 두 기기가 오프라인 중 수정)**은 자동 해결이 안 되므로 아래 8절에서 별도 처리합니다.

---

## 3. 인증 설계 (Authentication + Custom Claims)

### 3.1 로그인 방식
- 화면상 "사번 또는 교육생 번호"로 로그인하지만, Firebase Auth는 기본적으로 이메일 또는 전화번호 기반입니다.
- 권장 방식: **내부 사번/교육생번호를 `사번@fireacademy.local` 형태의 가상 이메일로 매핑**해서 `signInWithEmailAndPassword` 사용. 사용자에게는 화면에서 여전히 "사번"만 입력받고, 내부적으로만 변환합니다.

```js
// src/lib/auth.js
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

export async function loginWithId(loginId, password) {
  const email = `${loginId}@fireacademy.local`;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
export function logout() {
  return signOut(auth);
}
```

### 3.2 역할(STU/INS/ADM/APR/SYS) — Custom Claims로 부여

Firestore에 role을 저장하면 매 요청마다 문서를 읽어야 해서 느리고, 보안 규칙에서도 불편합니다. **Custom Claims**(Auth 토큰에 박히는 값)로 역할을 넣으면 보안 규칙과 프론트 라우팅 양쪽에서 빠르게 씁니다. Custom Claims는 클라이언트에서 직접 설정할 수 없고 **Admin SDK(Cloud Functions)에서만** 설정 가능 — 이게 "행정담당자가 계정을 발급/역할 부여한다"는 요구사항과 자연스럽게 맞습니다.

```js
// functions/src/accounts.js  (Cloud Functions, Admin SDK)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

exports.createAccount = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || caller.token.role !== "ADM") {
    throw new HttpsError("permission-denied", "행정담당자만 계정을 생성할 수 있습니다.");
  }
  const { loginId, name, role, courseId, org, phone } = request.data;
  const email = `${loginId}@fireacademy.local`;
  const tempPassword = generateTempPassword(); // 8자리 임시 비밀번호

  const userRecord = await getAuth().createUser({
    email, password: tempPassword, displayName: name,
  });
  await getAuth().setCustomUserClaims(userRecord.uid, { role, courseId });

  await getFirestore().doc(`users/${userRecord.uid}`).set({
    loginId, name, role, courseId, org, phone,
    status: "active", mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid,
  });

  await sendSmsTempPassword(phone, loginId, tempPassword); // adm.bulk 화면의 "초기 비밀번호 문자 발송"
  return { uid: userRecord.uid };
});
```

프론트에서 로그인 후 역할을 읽는 방법:

```js
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

onAuthStateChanged(auth, async (user) => {
  if (!user) return setRole(null);
  const token = await getIdTokenResult(user, true); // true = 강제 새로고침
  setRole(token.claims.role); // 'STU' | 'INS' | 'ADM' | 'APR' | 'SYS'
});
```

> 주의: 역할을 바꾼 직후(예: 잠금해제, 보직이동)에는 `getIdTokenResult(user, true)`로 강제 새로고침하지 않으면 기존 토큰(최대 1시간 캐시)에 옛 역할이 남아있습니다. `/sysadmin/roles`에서 권한 변경 시 대상 사용자에게 강제 로그아웃(`revokeRefreshTokens`)을 함께 호출하세요.

### 3.3 로그인 실패 5회 잠금

Firebase Auth 자체에는 실패 횟수 기반 잠금 기능이 없습니다. Firestore에 실패 카운터를 두고 Cloud Function으로 판단합니다.

```js
// 로그인 전에 호출하는 callable — 잠금 여부 확인
exports.checkLoginAllowed = onCall(async (request) => {
  const { loginId } = request.data;
  const ref = getFirestore().doc(`loginAttempts/${loginId}`);
  const snap = await ref.get();
  const data = snap.data();
  if (data?.lockedUntil && data.lockedUntil.toMillis() > Date.now()) {
    throw new HttpsError("permission-denied", "5회 로그인 실패로 계정이 잠겼습니다. 행정담당자에게 문의하세요.");
  }
  return { allowed: true };
});

// 로그인 실패 시 프론트에서 호출
exports.recordLoginFailure = onCall(async (request) => {
  const { loginId } = request.data;
  const ref = getFirestore().doc(`loginAttempts/${loginId}`);
  await getFirestore().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const count = (doc.data()?.count || 0) + 1;
    const patch = { count, lastFailAt: FieldValue.serverTimestamp() };
    if (count >= 5) patch.lockedUntil = Timestamp.fromMillis(Date.now() + 0); // ADM 해제 전까지 잠금
    tx.set(ref, patch, { merge: true });
  });
});
```

---

## 4. Firestore 데이터 모델

프로토타입(dc.html)의 mock 데이터 구조를 그대로 컬렉션 스키마로 옮깁니다.

```
users/{uid}
  loginId, name, role: 'STU'|'INS'|'ADM'|'APR'|'SYS',
  courseId, org, phone, status: 'active'|'locked'|'expired',
  createdAt, expiresAt

courses/{courseId}                         # adm.courses, adm.courseDetail
  name, type, startDate, endDate, instructorUid, capacity, status
  policy: { lateMinutes, earlyLeaveMinutes, lateToAbsentRatio,
            completionRate, correctionDeadlineDays, confirmDeadline }
  periods/{periodId}                       # 서브컬렉션 — 교시별 시간표
    no, dayOfWeek, startTime, endTime, subject, kind, place, authMethod

enrollments/{courseId}_{uid}               # 교육생-과정 매핑(다과정 이력 대비)
  uid, courseId, org, joinedAt

attendance/{courseId}/{date}/{periodId}/records/{uid}   # 실제 출결 기록 (핵심 컬렉션)
  status: 'pending'|'present'|'late'|'earlyLeave'|'absent'|'excused',
  checkedAt, checkedMethod: 'qr'|'gps'|'nfc'|'manual',
  confirmedBy, confirmedAt, locked: boolean,
  location: geopoint (GPS 인증 시)

corrections/{correctionId}                 # 정정 요청
  uid, courseId, date, periodId, before, after, reason,
  attachmentUrl, status: 'pending'|'approved'|'rejected',
  requestedAt, decidedBy, decidedAt, decisionNote

reports/{reportId}                         # 결과보고서
  courseId, type: 'daily'|'weekly'|'courseEnd', periodRange,
  writerUid, status: 'draft'|'submitted'|'reviewing'|'approved'|'rejected',
  summary: { total, present, late, earlyLeave, absent, rate },
  approvalPath: [{ step, uid, decidedAt, status }]

notices/{noticeId}
  title, body, target: 'all'|courseId|role, authorUid,
  publishAt, expireAt, attachments[]

devices/{deviceId}                         # QR/NFC 리더기
  type, location, mappedCourseId, lastSeenAt, status: 'online'|'offline'|'syncPending'

syncQueue/{queueId}                        # 오프라인 동기화 큐 (8절 참고)
  deviceId, records[], collectedAt, syncedAt, conflict: boolean

auditLogs/{logId}                          # 감사로그 — Cloud Functions가 자동 기록, 클라이언트 쓰기 금지
  at, actorUid, actorRole, target, action, reason, category
```

설계 포인트
- **`attendance`를 `courseId/date/periodId/records/{uid}`로 깊게 중첩**한 이유: 교관의 "교시 단위 일괄 확정"이 컬렉션 하나(`records`)를 통째로 batch write 하면 되도록 하기 위함입니다. (insConfirm 화면의 "4·5교시 일괄 확정" 버튼과 1:1 대응)
- `attendance` 문서에 `locked: true`가 찍히면 보안 규칙에서 일반 update를 막고, 이후 변경은 반드시 `corrections` 워크플로우를 거치게 강제합니다.
- `auditLogs`는 클라이언트가 절대 직접 쓰지 않고, 다른 컬렉션에 Cloud Functions가 쓰기를 수행할 때마다 함께 기록합니다 (5절 Functions 참고).

---

## 5. Firestore 보안 규칙

`firestore.rules` 예시 — 역할별 read/write를 Custom Claims로 통제합니다.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function role() { return request.auth.token.role; }
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function isInstructorOf(courseId) {
      return role() == 'INS' &&
        get(/databases/$(database)/documents/courses/$(courseId)).data.instructorUid == request.auth.uid;
    }

    match /users/{uid} {
      allow read: if isSignedIn() && (isOwner(uid) || role() in ['ADM','SYS','INS']);
      allow write: if false; // 계정 생성/수정은 반드시 Cloud Functions(Admin SDK) 경유
    }

    match /courses/{courseId} {
      allow read: if isSignedIn();
      allow write: if role() in ['ADM','SYS'];

      match /periods/{periodId} {
        allow read: if isSignedIn();
        allow write: if role() in ['ADM','SYS'];
      }
    }

    match /attendance/{courseId}/{date}/{periodId}/records/{uid} {
      // 교육생: 본인 문서만, 아직 잠기지 않은 것만, 상태는 pending류로만 셀프 신청 가능
      allow create, update: if role() == 'STU' && isOwner(uid)
        && resource.data.locked != true
        && request.resource.data.status in ['pending', 'earlyLeaveRequested'];
      // 교관: 담당 과정 전체 읽기/확정 가능 (확정은 Cloud Function 경유 권장, 여기선 담당 교관 write 허용 예시)
      allow read: if isSignedIn() && (isOwner(uid) || isInstructorOf(courseId) || role() in ['ADM','APR','SYS']);
      allow update: if isInstructorOf(courseId) && resource.data.locked != true;
      allow delete: if false;
    }

    match /corrections/{id} {
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || role() in ['INS','ADM','SYS']);
      allow update: if role() == 'INS'; // 승인/반려만 교관 — 실제로는 Cloud Function으로 이전 권장
    }

    match /reports/{id} {
      allow read: if role() in ['INS','ADM','APR','SYS'];
      allow write: if false; // 생성·상태변경은 전부 Cloud Functions
    }

    match /auditLogs/{id} {
      allow read: if role() in ['ADM','SYS'];
      allow write: if false; // 오직 Admin SDK(Cloud Functions)만 기록
    }

    match /devices/{id} {
      allow read: if role() in ['ADM','SYS'];
      allow write: if role() in ['ADM','SYS'];
    }
  }
}
```

배포: `firebase deploy --only firestore:rules`

> 정정 승인(`corrections` update)과 출결 확정(`attendance` update)은 위 규칙처럼 클라이언트 SDK write를 열어두는 것보다, **아래 6절처럼 callable function으로만 처리**하고 규칙에서는 `allow write: if false`로 완전히 막는 쪽을 더 권장합니다. 그래야 "확정 시 자동으로 감사로그 기록", "지각→결석 환산 재계산" 같은 부수효과를 서버에서 원자적으로 보장할 수 있습니다.

---

## 6. Cloud Functions — 핵심 비즈니스 로직

### 6.1 출석체크 (교육생 셀프체크) — QR/GPS 인증

```js
exports.checkIn = onCall(async (request) => {
  const uid = request.auth.uid;
  if (request.auth.token.role !== 'STU') throw new HttpsError('permission-denied', '교육생만 체크할 수 있습니다.');
  const { courseId, date, periodId, method, location } = request.data;

  const period = await getFirestore().doc(`courses/${courseId}/periods/${periodId}`).get();
  const p = period.data();

  if (method === 'gps') {
    const dist = haversine(location, p.geofence.center);
    if (dist > p.geofence.radiusM) {
      throw new HttpsError('failed-precondition', '교육장 반경 밖입니다. GPS 인증이 불가합니다.');
    }
  }

  const now = new Date();
  const startTime = combineDateTime(date, p.startTime);
  const lateThreshold = new Date(startTime.getTime() + p.course.lateMinutes * 60000);
  const status = now > lateThreshold ? 'late' : 'pending'; // pending=출석 신청, late=지각 자동판정

  const ref = getFirestore().doc(`attendance/${courseId}/${date}/${periodId}/records/${uid}`);
  await ref.set({
    status, checkedAt: FieldValue.serverTimestamp(), checkedMethod: method,
    location: method === 'gps' ? new GeoPoint(location.lat, location.lng) : null,
    locked: false,
  }, { merge: true });

  await writeAudit({ actorUid: uid, actorRole: 'STU', target: `${courseId}/${date}/${periodId}/${uid}`,
    action: status === 'late' ? '지각 체크' : '출석 체크', category: '출결 변경' });

  return { status };
});
```

### 6.2 교관 일괄 확정 — 확정 후 잠금 + 감사로그

```js
exports.confirmPeriod = onCall(async (request) => {
  if (request.auth.token.role !== 'INS') throw new HttpsError('permission-denied', '교관만 확정할 수 있습니다.');
  const { courseId, date, periodId } = request.data;

  const recordsRef = getFirestore().collection(`attendance/${courseId}/${date}/${periodId}/records`);
  const snap = await recordsRef.get();

  const batch = getFirestore().batch();
  snap.forEach((doc) => {
    const d = doc.data();
    const finalStatus = d.status === 'pending' ? 'present' : (d.status || 'absent'); // 미체크는 결석 처리
    batch.update(doc.ref, {
      status: finalStatus, locked: true,
      confirmedBy: request.auth.uid, confirmedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  await writeAudit({ actorUid: request.auth.uid, actorRole: 'INS', target: `${courseId}/${date}/${periodId}`,
    action: '출석 확정', category: '출석 확정' });

  return { confirmedCount: snap.size };
});
```

### 6.3 정정 승인/반려 — 원본 출결 데이터까지 함께 갱신

```js
exports.decideCorrection = onCall(async (request) => {
  if (request.auth.token.role !== 'INS') throw new HttpsError('permission-denied');
  const { correctionId, decision, note } = request.data; // decision: 'approved' | 'rejected'

  const corrRef = getFirestore().doc(`corrections/${correctionId}`);
  const corr = (await corrRef.get()).data();

  await getFirestore().runTransaction(async (tx) => {
    tx.update(corrRef, { status: decision, decidedBy: request.auth.uid,
      decidedAt: FieldValue.serverTimestamp(), decisionNote: note });

    if (decision === 'approved') {
      const attRef = getFirestore().doc(
        `attendance/${corr.courseId}/${corr.date}/${corr.periodId}/records/${corr.uid}`);
      tx.update(attRef, { status: corr.afterStatus, locked: true, correctedFrom: correctionId });
    }
  });

  await writeAudit({ actorUid: request.auth.uid, actorRole: 'INS', target: `correction/${correctionId}`,
    action: decision === 'approved' ? '정정 승인' : '정정 반려', reason: note,
    category: decision === 'approved' ? '정정 승인' : '정정 반려' });

  // stu.alerts 화면에 뜨는 알림 생성
  await getFirestore().collection('notifications').add({
    uid: corr.uid, title: decision === 'approved' ? '정정 요청 승인' : '정정 요청 반려',
    body: note, createdAt: FieldValue.serverTimestamp(), read: false,
  });

  return { ok: true };
});
```

### 6.4 지각→결석 환산 및 수료 위험자 계산 (스케줄 함수)

`adm.policy` 화면의 "지각 3회 = 결석 1회", "수료 출석률 90%" 규정을 매일 밤 배치로 재계산합니다.

```js
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.nightlyAttendanceRollup = onSchedule({ schedule: "every day 01:00", timeZone: "Asia/Seoul" }, async () => {
  const courses = await getFirestore().collection('courses').where('status', '==', 'active').get();
  for (const courseDoc of courses.docs) {
    const course = courseDoc.data();
    const students = await getFirestore().collection('users')
      .where('courseId', '==', courseDoc.id).where('role', '==', 'STU').get();

    for (const stu of students.docs) {
      const { late, earlyLeave, absent, totalPeriods } = await countAttendance(courseDoc.id, stu.id);
      const convertedAbsent = absent + Math.floor(late / course.policy.lateToAbsentRatio)
        + Math.floor(earlyLeave / course.policy.lateToAbsentRatio);
      const rate = ((totalPeriods - convertedAbsent) / totalPeriods) * 100;

      await getFirestore().doc(`enrollments/${courseDoc.id}_${stu.id}`).set(
        { rate, convertedAbsent, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      if (rate < course.policy.completionRate + 5 && rate >= course.policy.completionRate) {
        await notify(stu.id, '수료 요건 주의', `누적 출석률 ${rate.toFixed(1)}% — 기준(${course.policy.completionRate}%) 근접`);
      } else if (rate < course.policy.completionRate) {
        await notify(stu.id, '수료 요건 미달 위험', `누적 출석률 ${rate.toFixed(1)}%`);
        await notifyOrg(stu.data().org, stu.data().name, rate); // 소속기관 통보 (4.7 알림·통보 대응)
      }
    }
  }
});
```

### 6.5 확정 마감시간 미확정 알림 (`ins.home`의 "확정 대기" 배너 실데이터화)

```js
exports.confirmDeadlineCheck = onSchedule({ schedule: "every day 18:00", timeZone: "Asia/Seoul" }, async () => {
  // 오늘자 attendance 중 locked:false 남아있는 course/period를 찾아 담당 교관에게 알림
  // (Firestore는 collectionGroup 쿼리로 records를 가로질러 조회)
  const unlocked = await getFirestore().collectionGroup('records')
    .where('locked', '==', false).get();
  const byInstructor = groupByInstructor(unlocked);
  for (const [instructorUid, items] of Object.entries(byInstructor)) {
    await notify(instructorUid, '확정 대기 알림', `미확정 교시 ${items.length}건 — 18:00 마감 경과`);
  }
});
```

### 6.6 감사로그 공통 헬퍼

```js
async function writeAudit({ actorUid, actorRole, target, action, reason, category }) {
  await getFirestore().collection('auditLogs').add({
    at: FieldValue.serverTimestamp(), actorUid, actorRole, target, action, reason: reason || null, category,
  });
}
```

---

## 7. Cloud Storage — 증빙파일 첨부 (정정 요청)

```js
// 클라이언트: 정정 요청 화면(stu.correction)의 "증빙파일 첨부"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

async function uploadEvidence(uid, correctionDraftId, file) {
  const path = `corrections/${uid}/${correctionDraftId}/${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
```

```
// storage.rules
service firebase.storage {
  match /b/{bucket}/o {
    match /corrections/{uid}/{correctionId}/{fileName} {
      allow read: if request.auth != null &&
        (request.auth.uid == uid || request.auth.token.role in ['INS','ADM','SYS']);
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('application/pdf|image/.*');
    }
  }
}
```

---

## 8. 오프라인 훈련장 동기화 — 충돌 처리 (`sys.sync` 화면 실데이터화)

Firestore의 자동 오프라인 지속성은 "같은 클라이언트가 오프라인이었다가 온라인 복귀"는 잘 처리하지만, **QR 리더기(디바이스) 자체가 완전히 네트워크 단절**된 경우(리더기가 로컬에 로그를 쌓아두는 임베디드 기기)는 아래처럼 별도 큐 방식이 필요합니다.

1. 리더기/키오스크 앱은 오프라인 중 스캔 기록을 로컬(SQLite 등)에 쌓음
2. 재연결 시 `syncQueue` 컬렉션에 배치로 업로드
3. Cloud Function이 `syncQueue` 문서 생성을 트리거로 감지해 실제 `attendance` 레코드에 반영, 이미 확정(`locked:true`)된 교시와 충돌하면 `conflict:true`로 표시하고 자동 반영하지 않음 → `sys.sync` 화면의 "충돌 — 중복 기록" 상태로 노출, 관리자가 수동 병합

```js
exports.onSyncQueueCreate = onDocumentCreated("syncQueue/{queueId}", async (event) => {
  const data = event.data.data();
  for (const record of data.records) {
    const attRef = getFirestore().doc(
      `attendance/${record.courseId}/${record.date}/${record.periodId}/records/${record.uid}`);
    const existing = await attRef.get();
    if (existing.exists && existing.data().locked) {
      await event.data.ref.update({ conflict: true }); // 관리자 수동 해결 대기
      continue;
    }
    await attRef.set({ status: record.status, checkedAt: record.collectedAt,
      checkedMethod: record.method, syncedFrom: data.deviceId, locked: false }, { merge: true });
  }
  await event.data.ref.update({ syncedAt: FieldValue.serverTimestamp() });
});
```

---

## 9. Hosting 배포

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage": { "rules": "storage.rules" },
  "functions": { "source": "functions" }
}
```

```bash
npm run build
firebase deploy --only hosting,firestore:rules,storage:rules,functions
```

내부망 전용으로 운영한다면 커스텀 도메인 대신 소방학교 내부 DNS로 연결하거나, Hosting 대신 내부 웹서버 + Firebase 백엔드만 쓰는 구성도 가능합니다.

---

## 10. 로컬 개발 — Firebase Emulator Suite

실제 프로젝트에 영향 없이 개발하려면 에뮬레이터를 씁니다.

```bash
firebase init emulators   # Auth, Firestore, Functions, Storage 선택
firebase emulators:start
```

```js
// 개발 환경에서만 에뮬레이터로 연결
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
```

---

## 11. 마이그레이션 로드맵 (프로토타입 → 실제 서비스)

1. **1주차**: Firebase 프로젝트 생성, Auth/Firestore/Functions 뼈대, 위 데이터 모델대로 컬렉션 설계, 보안 규칙 초안
2. **2~3주차**: 프론트엔드를 React(또는 Next.js)로 신규 구축 — dc.html의 각 `scr.*` 블록을 페이지/컴포넌트로 1:1 이전 (마크업·문구·상태 흐름은 이미 검증됐으므로 그대로 옮기면 됨), Firebase SDK 연동
3. **4주차**: Cloud Functions로 6절의 핵심 로직(체크인, 확정, 정정승인, 야간 롤업) 구현, 에뮬레이터로 통합테스트
4. **5주차**: 알림(SMS/이메일) 연동 — 한국은 Firebase Extensions의 Twilio가 아니라 **알리고, 네이버 클라우드 SENS 등 국내 SMS 사업자 API**를 Cloud Functions에서 직접 호출하는 방식을 권장 (Twilio는 해외망 발신이라 국내 통신사 스팸 차단·비용 이슈 발생 가능)
5. **6주차**: 1개 과정 대상 파일럿 운영 (기획 문서 6절의 "1단계 파일럿"과 연결), 수기 병행
6. **파일럿 종료 후**: 0절의 CSAP/공공기관 클라우드 규정 검토 결과에 따라 정식 운영 환경(Firebase 유지 or 국내 CSAP 클라우드로 이전) 결정

---

## 12. 참고 — 지금 dc.html 프로토타입에서 그대로 가져올 수 있는 것

- `SCREENS` 라우트 테이블 → 그대로 React Router / Next.js 라우트 정의로 이식
- `STUDENTS`, `policyRules`, `periods()` 등 mock 데이터 구조 → Firestore 문서 필드 설계의 기준으로 그대로 사용 (이미 이 문서의 4절 스키마가 그 구조를 따름)
- `pillStyle(k)` 같은 상태별 색상 매핑(`ok/warn/bad/info/mute`) → 그대로 프론트 컴포넌트 스타일 유틸로 재사용
- `_ds/design-system-.../` 디자인 시스템 토큰(CSS 변수) → React 컴포넌트에 그대로 import 가능 (링크만 새 프로젝트에 복사)
