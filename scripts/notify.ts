/**
 * 카카오톡 알림 발송 (GitHub Actions 스케줄에서 실행)
 *   npx tsx scripts/notify.ts --slot morning|evening|listing [--dry-run]
 */
import { buildMessage, type Slot } from '../src/lib/notify';
import { todayKst } from '../src/lib/dates';
import { buildTasks } from '../src/lib/todo';
import type { Account, Broker, Ipo, Subscription } from '../src/lib/types';
import { adminDb, requireEnv } from './lib/admin';
import { refreshAccessToken, sendToMe, type TokenDoc } from './lib/kakao';

const SLOTS: Slot[] = ['morning', 'evening', 'listing'];

async function main() {
  const args = process.argv.slice(2);
  const slot = args[args.indexOf('--slot') + 1] as Slot;
  const dry = args.includes('--dry-run');
  if (!SLOTS.includes(slot)) throw new Error(`--slot 은 ${SLOTS.join('|')} 중 하나여야 해요.`);

  const db = adminDb();
  const restKey = dry ? '' : requireEnv('KAKAO_REST_API_KEY');
  const secret = process.env.KAKAO_CLIENT_SECRET || undefined;
  const link = process.env.APP_URL || 'https://example.com';
  const today = todayKst();

  let sent = 0, skipped = 0, failed = 0;
  const households = await db.collection('households').get();
  for (const h of households.docs) {
    const col = (n: string) => h.ref.collection(n).get();
    const [ipoS, brokerS, accS, subS, memS] = await Promise.all(['ipos', 'brokers', 'accounts', 'subscriptions', 'members'].map(col));
    const ipos = ipoS.docs.map((d) => ({ id: d.id, collected: d.get('collected') ?? {}, manual: d.get('manual') ?? {} }) as Ipo);
    const brokers = brokerS.docs.map((d) => d.data() as Broker);
    const accounts = accS.docs.map((d) => ({ ...d.data(), id: d.id }) as Account & { ownerUid: string });
    const subs = subS.docs.map((d) => ({ ...d.data(), id: d.id }) as Subscription & { ownerUid: string });

    for (const m of memS.docs) {
      const uid = m.id;
      const tasks = buildTasks({
        today, ipos, brokers,
        accounts: accounts.filter((a) => a.ownerUid === uid),
        subscriptions: subs.filter((s) => s.ownerUid === uid),
      });
      const text = buildMessage(slot, tasks, today);
      if (!text) { skipped++; continue; }
      if (dry) { console.log(`[dry-run] ${m.get('name') ?? uid}\n${text}\n`); sent++; continue; }

      const tokenRef = db.collection('kakaoTokens').doc(uid);
      const tokenSnap = await tokenRef.get();
      if (!tokenSnap.exists) { console.warn(`카카오 미연동: ${m.get('name') ?? uid} (건너뜀)`); skipped++; continue; }
      try {
        const tok = tokenSnap.data() as TokenDoc;
        const { accessToken, newRefreshToken } = await refreshAccessToken(fetch, restKey, tok.refreshToken, secret);
        if (newRefreshToken) await tokenRef.set({ refreshToken: newRefreshToken, updatedAt: Date.now() });
        await sendToMe(fetch, accessToken, text, link);
        sent++;
      } catch (e) {
        failed++;
        console.error(`전송 실패(${m.get('name') ?? uid}): ${(e as Error).message}`);
      }
    }
  }
  console.log(`slot=${slot} date=${today} sent=${sent} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1; // Actions 실행 실패로 표시되어 이메일 알림을 받을 수 있음
}

main().catch((e) => { console.error(e.message); process.exit(1); });
