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

// 옥외훈련장 등 오프라인 상황 대응 — 재연결 시 자동 동기화
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("여러 탭이 열려 있어 오프라인 지속성은 한 탭에서만 활성화됩니다.");
  } else if (err.code === "unimplemented") {
    console.warn("현재 브라우저는 오프라인 지속성을 지원하지 않습니다.");
  }
});

if (import.meta.env.DEV) {
  const { connectAuthEmulator } = await import("firebase/auth");
  const { connectFirestoreEmulator } = await import("firebase/firestore");
  const { connectFunctionsEmulator } = await import("firebase/functions");
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  if (useEmulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    console.info("[firebase] 로컬 에뮬레이터에 연결됨");
  }
}
