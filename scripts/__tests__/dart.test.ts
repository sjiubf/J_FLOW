import { describe, expect, it } from 'vitest';
import { brokerIdsFromText } from '../../src/lib/brokers';
import { isSpacName, parseCandidates, type DartListItem } from '../lib/dart';

const it_ = (o: Partial<DartListItem>): DartListItem => ({
  corp_code: '0001', corp_name: '가나다', corp_cls: 'E', report_nm: '증권신고서(지분증권)', rcept_no: '20261105000001', rcept_dt: '20261105', ...o,
});

describe('parseCandidates', () => {
  it('상장 전 법인(E)만, 유상증자 등 상장사(K/Y)는 제외', () => {
    const r = parseCandidates([it_({}), it_({ corp_code: '0002', corp_cls: 'K', corp_name: '상장사' })]);
    expect(r.map((x) => x.collected.name)).toEqual(['가나다']);
  });
  it('정정 공시는 최신 접수번호로 1건만', () => {
    const r = parseCandidates([
      it_({ rcept_no: '20261105000001' }),
      it_({ rcept_no: '20261110000009', report_nm: '[기재정정]증권신고서(지분증권)', rcept_dt: '20261110' }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].rceptNo).toBe('20261110000009');
    expect(r[0].filedAt).toBe('2026-11-10');
    expect(r[0].id).toBe('dart_0001');
  });
  it('증권신고서가 아닌 공시는 제외, 스팩 이름은 spac', () => {
    const r = parseCandidates([it_({ report_nm: '주요사항보고서' }), it_({ corp_code: '0003', corp_name: '제12호기업인수목적' })]);
    expect(r).toHaveLength(1);
    expect(r[0].collected.type).toBe('spac');
    expect(isSpacName('케이비제12호기업인수목적')).toBe(true);
  });
});

describe('brokerIdsFromText', () => {
  it('인수인 텍스트에서 증권사 id 추출', () => {
    expect(brokerIdsFromText('대표주관회사: 미래에셋증권(주), 인수회사: NH투자증권, 삼성증권').sort()).toEqual(['mirae', 'nh', 'samsung']);
  });
});
