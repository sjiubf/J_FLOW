import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/** FIREBASE_SERVICE_ACCOUNT(서비스 계정 JSON 전체)로 Admin SDK 초기화. 값은 절대 출력하지 않는다. */
export function adminDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 환경 변수가 없어요.');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  return getFirestore();
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경 변수가 없어요.`);
  return v;
}
