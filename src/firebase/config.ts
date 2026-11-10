/**
 * Firebase 웹 앱 설정. 값은 .env (EXPO_PUBLIC_*) 에서 읽는다. 이 값들은 비밀이 아니다(보안은 Firestore 규칙이 담당).
 * 주의: Expo는 `process.env.EXPO_PUBLIC_NAME` 형태의 직접 참조만 빌드 시 값으로 치환한다. 변수에 담아 쓰면 안 된다.
 */
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

export const isFirebaseConfigured = !!apiKey && !!projectId;

// 설정이 비어 있어도 앱이 죽지 않고 '설정 필요' 화면을 띄울 수 있게 자리표시 값을 넣는다.
export const firebaseConfig = {
  apiKey: apiKey || 'unconfigured',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: projectId || 'unconfigured',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
