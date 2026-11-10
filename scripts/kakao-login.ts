/**
 * 카카오 "나에게 보내기" 최초 연동 (가족 각자 1회, 로컬 PC에서 실행)
 *   1) npx tsx scripts/kakao-login.ts url <redirect-uri>
 *        → 출력된 주소를 브라우저에서 열어 로그인·동의하면 redirect-uri?code=XXXX 로 이동. code 값을 복사
 *   2) npx tsx scripts/kakao-login.ts save <구글-이메일> <redirect-uri> <code>
 *        → 리프레시 토큰을 Firestore(kakaoTokens/{uid})에 저장 (클라이언트 접근 불가 컬렉션)
 */
import { adminDb, requireEnv } from './lib/admin';
import { authorizeUrl, exchangeCode } from './lib/kakao';

async function main() {
  const [cmd, a, b, c] = process.argv.slice(2);
  const restKey = requireEnv('KAKAO_REST_API_KEY');
  if (cmd === 'url') {
    if (!a) throw new Error('사용법: url <redirect-uri>');
    console.log(authorizeUrl(restKey, a));
    return;
  }
  if (cmd === 'save') {
    if (!a || !b || !c) throw new Error('사용법: save <구글-이메일> <redirect-uri> <code>');
    const email = a.trim().toLowerCase();
    const db = adminDb();
    const members = await db.collectionGroup('members').where('email', '==', email).get();
    if (members.empty) throw new Error(`${email} 로 로그인한 가족 구성원을 찾지 못했어요. 앱에 먼저 로그인하세요.`);
    const uid = members.docs[0].id;
    const { refreshToken } = await exchangeCode(fetch, restKey, b, c, process.env.KAKAO_CLIENT_SECRET || undefined);
    await db.collection('kakaoTokens').doc(uid).set({ refreshToken, updatedAt: Date.now() });
    console.log(`저장 완료: ${email}`);
    return;
  }
  throw new Error('사용법: url <redirect-uri> | save <email> <redirect-uri> <code>');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
