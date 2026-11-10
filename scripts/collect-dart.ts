/**
 * DART 증권신고서 목록에서 공모주 후보를 수집해 모든 가족 그룹의 종목(ipos)에 반영한다.
 *   npx tsx scripts/collect-dart.ts [--days 14] [--dry-run]
 * 수집값은 collected 에만 쓴다. 사람이 고친 manual 값은 건드리지 않는다.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireEnv } from './lib/admin';
import { parseCandidates, type DartListItem } from './lib/dart';

const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '');

async function main() {
  const args = process.argv.slice(2);
  const days = Number(args[args.indexOf('--days') + 1]) || 14;
  const dry = args.includes('--dry-run');
  const key = requireEnv('DART_API_KEY');
  const detailType = process.env.DART_DETAIL_TYPE || 'C001';

  const end = new Date();
  const bgn = new Date(end.getTime() - days * 86_400_000);
  const items: DartListItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const q = new URLSearchParams({
      crtfc_key: key, bgn_de: ymd(bgn), end_de: ymd(end), pblntf_ty: 'C', pblntf_detail_ty: detailType,
      page_no: String(page), page_count: '100',
    });
    const res = await fetch(`https://opendart.fss.or.kr/api/list.json?${q.toString()}`);
    const json = (await res.json()) as { status: string; message?: string; list?: DartListItem[]; total_page?: number };
    if (json.status === '013') break; // 조회된 데이터가 없음
    if (json.status !== '000') throw new Error(`DART 오류 ${json.status}: ${json.message ?? ''}`);
    items.push(...(json.list ?? []));
    if (page >= (json.total_page ?? 1)) break;
  }

  const candidates = parseCandidates(items);
  console.log(`DART 조회 ${items.length}건 → 공모주 후보 ${candidates.length}건`);
  if (dry) { for (const c of candidates) console.log(`- ${c.collected.name} (${c.collected.type}) ${c.rceptNo}`); return; }

  const db = adminDb();
  const households = await db.collection('households').get();
  for (const h of households.docs) {
    for (const c of candidates) {
      await h.ref.collection('ipos').doc(c.id).set(
        {
          collected: c.collected,
          dartRceptNo: c.rceptNo,
          dartFiledAt: c.filedAt,
          updatedBy: 'dart-collector',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }
  console.log(`가족 그룹 ${households.size}곳에 반영 완료`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
