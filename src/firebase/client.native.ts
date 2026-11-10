// 네이티브(Android) 클라이언트: 로그인 상태를 AsyncStorage에 유지한다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence 는 firebase 의 react-native 번들에만 있고 기본 타입 선언에는 빠져 있다.
const persistence = (FirebaseAuth as unknown as {
  getReactNativePersistence: (s: typeof AsyncStorage) => FirebaseAuth.Persistence;
}).getReactNativePersistence(AsyncStorage);

export const auth = (() => {
  try {
    return FirebaseAuth.initializeAuth(app, { persistence });
  } catch {
    // 개발 중 핫 리로드로 이미 초기화된 경우
    return FirebaseAuth.getAuth(app);
  }
})();
export const db = getFirestore(app);
