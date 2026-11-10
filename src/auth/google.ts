// 네이티브 Google 로그인 → Firebase 자격 증명으로 교환
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebase/client';
import { googleWebClientId } from '../firebase/config';

let configured = false;

export async function signInWithGoogle(): Promise<void> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: googleWebClientId });
    configured = true;
  }
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') return; // 사용자가 취소
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google ID 토큰을 받지 못했어요. webClientId 설정을 확인하세요.');
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

export async function signOutAll(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* 무시 */
  }
  await fbSignOut(auth);
}
