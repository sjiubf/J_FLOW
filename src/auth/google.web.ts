// 웹 Google 로그인: Firebase 팝업
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebase/client';

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutAll(): Promise<void> {
  await fbSignOut(auth);
}
