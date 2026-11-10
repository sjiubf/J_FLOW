/**
 * DART 공시 목록(list.json) 응답에서 공모주 후보를 뽑는다.
 * - 공시상세유형 C001(증권신고서-지분증권)을 조회한다. (코드는 DART_DETAIL_TYPE 로 바꿀 수 있음)
 * - 지분증권 신고서에는 유상증자도 섞여 있어서, 상장 전 법인(corp_cls === 'E')만 공모주로 본다.
 *   이는 경험적 휴리스틱이라 실제 응답으로 한 번 확인이 필요하다.
 */
import { brokerIdsFromText } from '../../src/lib/brokers';
import type { IpoFields } from '../../src/lib/types';

export interface DartListItem {
  corp_code: string;
  corp_name: string;
  corp_cls: string;
  report_nm: string;
  rcept_no: string;
  rcept_dt: string; // YYYYMMDD
}

export interface DartCandidate {
  id: string;
  rceptNo: string;
  filedAt: string; // YYYY-MM-DD
  collected: Pick<IpoFields, 'name' | 'type'> & Partial<IpoFields>;
}

export const isSpacName = (name: string) => name.includes('기업인수목적');

const fmt = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

export function parseCandidates(list: DartListItem[]): DartCandidate[] {
  const latest = new Map<string, DartListItem>();
  for (const it of list) {
    if (it.corp_cls !== 'E') continue;
    if (!it.report_nm.includes('증권신고서')) continue;
    const prev = latest.get(it.corp_code);
    if (!prev || it.rcept_no > prev.rcept_no) latest.set(it.corp_code, it); // 정정 공시는 최신 접수번호로
  }
  return [...latest.values()].map((it) => ({
    id: `dart_${it.corp_code}`,
    rceptNo: it.rcept_no,
    filedAt: fmt(it.rcept_dt),
    collected: { name: it.corp_name, type: isSpacName(it.corp_name) ? 'spac' : 'general' },
  }));
}

/** 인수인 텍스트에서 증권사 id 추출(상세 조회가 가능해지면 사용) */
export const underwritersFromText = brokerIdsFromText;
