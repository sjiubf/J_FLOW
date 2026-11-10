import { describe, expect, it } from 'vitest';
import { planMargin } from '../planner';
import { requiredMargin, effective } from '../ipo';
import { accounts, brokers, ipo1, mkIpo, sub } from './fixtures';

describe('requiredMargin', () => {
  it('공모가 × 최소주수 × 증거금률', () => {
    expect(requiredMargin(20000, brokers[0])).toBe(100000);
    expect(requiredMargin(2000, brokers[0])).toBe(10000);
    expect(requiredMargin(12345, brokers[0])).toBe(61725);
  });
});

describe('effective', () => {
  it('수동 보정값이 수집값보다 우선', () => {
    const e = effective({ id: 'x', collected: { name: '수집', offerPrice: 100 }, manual: { offerPrice: 200 } });
    expect(e.name).toBe('수집');
    expect(e.offerPrice).toBe(200);
  });
});

describe('planMargin', () => {
  const base = { ipos: [ipo1], brokers, accounts, subscriptions: [], budget: 1_000_000 };

  it('대상 계좌만 고르고 비대상은 제외', () => {
    const p = planMargin({ ...base, ipo: ipo1 });
    expect(p.picks.map((x) => x.account.id).sort()).toEqual(['acc-a', 'acc-b']);
    expect(p.ineligible.map((a) => a.id)).toEqual(['acc-c']);
    expect(p.totalMargin).toBe(200000);
    expect(p.remaining).toBe(800000);
  });

  it('수수료가 낮은 계좌를 먼저 추천', () => {
    const p = planMargin({ ...base, ipo: ipo1 });
    expect(p.picks[0].broker.id).toBe('b');
  });

  it('자금이 모자라면 일부는 overBudget', () => {
    const p = planMargin({ ...base, ipo: ipo1, budget: 150000 });
    expect(p.picks).toHaveLength(1);
    expect(p.overBudget).toHaveLength(1);
    expect(p.warnings.join()).toContain('자금이 모자라');
  });

  it('겹치는 다른 종목에 묶인 증거금을 차감', () => {
    const other = mkIpo('i2', {
      name: '라마바', type: 'general', offerPrice: 50000,
      subscribeStart: '2026-11-23', subscribeEnd: '2026-11-24', refundDate: '2026-11-26',
      underwriters: ['a'],
    });
    const p = planMargin({
      ...base, ipo: ipo1, ipos: [ipo1, other],
      subscriptions: [sub('i2', 'acc-a', { subscribed: true })],
    });
    // 50,000 × 10 × 0.5 = 250,000 묶임
    expect(p.lockedByOthers).toBe(250000);
    expect(p.conflicts).toEqual(['라마바']);
    expect(p.available).toBe(750000);
  });

  it('환불일 당일 마감인 종목은 자금 재사용 가능', () => {
    const early = mkIpo('i3', {
      name: '사아자', type: 'general', offerPrice: 50000,
      subscribeStart: '2026-11-20', subscribeEnd: '2026-11-21', refundDate: '2026-11-25',
      underwriters: ['a'],
    });
    const p = planMargin({
      ...base, ipo: ipo1, ipos: [ipo1, early],
      subscriptions: [sub('i3', 'acc-a', { subscribed: true })],
    });
    expect(p.lockedByOthers).toBe(0);
  });

  it('환불 확인 끝난 종목은 묶이지 않음', () => {
    const other = mkIpo('i2', {
      offerPrice: 50000, subscribeEnd: '2026-11-24', refundDate: '2026-11-26', underwriters: ['a'], name: 'x',
    });
    const p = planMargin({
      ...base, ipo: ipo1, ipos: [ipo1, other],
      subscriptions: [sub('i2', 'acc-a', { subscribed: true, refundChecked: true })],
    });
    expect(p.lockedByOthers).toBe(0);
  });

  it('이미 청약한 계좌는 done으로 계산에 포함, 건너뜀은 제외', () => {
    const p = planMargin({
      ...base, ipo: ipo1,
      subscriptions: [sub('i1', 'acc-a', { subscribed: true }), sub('i1', 'acc-b', { skipped: true })],
    });
    expect(p.done).toHaveLength(1);
    expect(p.picks).toHaveLength(0);
    expect(p.totalMargin).toBe(100000);
  });

  it('스팩은 공모가 미입력 시 2,000원으로 계산', () => {
    const spac = mkIpo('s1', { name: '스팩', type: 'spac', underwriters: ['a'] });
    const p = planMargin({ ...base, ipo: spac, ipos: [spac] });
    expect(p.price).toBe(2000);
    expect(p.picks[0].margin).toBe(10000);
  });

  it('공모가가 없으면 경고', () => {
    const noPrice = mkIpo('n1', { name: '미정', type: 'general', underwriters: ['a'] });
    const p = planMargin({ ...base, ipo: noPrice, ipos: [noPrice] });
    expect(p.picks).toHaveLength(0);
    expect(p.warnings.join()).toContain('공모가');
  });
});
