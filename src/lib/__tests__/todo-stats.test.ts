import { describe, expect, it } from 'vitest';
import { addDays, diffDays, todayKst } from '../dates';
import { buildMessage } from '../notify';
import { monthStats, netProfitOf } from '../stats';
import { buildTasks } from '../todo';
import { accounts, brokers, ipo1, sub } from './fixtures';

describe('dates', () => {
  it('addDays / diffDays', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-12-03', '2026-11-25')).toBe(8);
  });
  it('todayKst는 UTC+9', () => {
    expect(todayKst(new Date('2026-11-24T16:00:00Z'))).toBe('2026-11-25');
    expect(todayKst(new Date('2026-11-24T14:59:00Z'))).toBe('2026-11-24');
  });
});

const base = { ipos: [ipo1], brokers, accounts };

describe('buildTasks', () => {
  it('마감 전날: 이체 필요', () => {
    const t = buildTasks({ ...base, today: '2026-11-24', subscriptions: [] });
    expect(t.map((x) => x.kind)).toEqual(['transfer']);
    expect(t[0].text).toContain('2개');
  });
  it('마감 당일: 미청약만, 청약·건너뜀은 제외', () => {
    const t = buildTasks({
      ...base, today: '2026-11-25',
      subscriptions: [sub('i1', 'acc-a', { subscribed: true }), sub('i1', 'acc-b', { skipped: true })],
    });
    expect(t).toHaveLength(0);
    const t2 = buildTasks({ ...base, today: '2026-11-25', subscriptions: [sub('i1', 'acc-a', { subscribed: true })] });
    expect(t2[0].kind).toBe('subscribe');
    expect(t2[0].text).toContain('B증권');
  });
  it('환불일 이후: 환불 확인 → 배정 입력 → 상장일 매도', () => {
    const subs = [sub('i1', 'acc-a', { subscribed: true })];
    const t = buildTasks({ ...base, today: '2026-11-27', subscriptions: subs });
    expect(t.map((x) => x.kind)).toEqual(['refund', 'allocation']);
    const t2 = buildTasks({
      ...base, today: '2026-12-03',
      subscriptions: [sub('i1', 'acc-a', { subscribed: true, refundChecked: true, allocatedQty: 2 })],
    });
    expect(t2.map((x) => x.kind)).toEqual(['listing']);
    expect(t2[0].day).toBe('today');
  });
});

describe('notify', () => {
  it('보낼 게 없으면 null', () => {
    expect(buildMessage('morning', [], '2026-11-25')).toBeNull();
  });
  it('슬롯별로 알맞은 작업만 포함', () => {
    const tasks = buildTasks({ ...base, today: '2026-11-24', subscriptions: [] });
    expect(buildMessage('morning', tasks, '2026-11-24')).toBeNull();
    expect(buildMessage('evening', tasks, '2026-11-24')).toContain('증거금 이체');
  });
});

describe('stats', () => {
  it('netProfitOf: 매도 전이면 null', () => {
    expect(netProfitOf(sub('i1', 'acc-a', { allocatedQty: 2 }), 20000, 2000)).toBeNull();
  });
  it('netProfitOf: 매도대금 − 원가 − 청약수수료 − 매도비용', () => {
    const s = sub('i1', 'acc-a', { allocatedQty: 2, sellPrice: 40000, sellCosts: 300 });
    expect(netProfitOf(s, 20000, 2000)).toBe(80000 - 40000 - 2000 - 300);
  });

  const ctx = { ...base, budget: 1_000_000, today: '2026-12-10' };
  it('월 통계: 순수익·회전율·놓친 청약', () => {
    const subs = [
      sub('i1', 'acc-a', { subscribed: true, allocatedQty: 2, sellPrice: 40000, sellCosts: 300 }),
      // acc-b: 청약도 건너뜀도 아님 → 놓침
    ];
    const s = monthStats('2026-12', { ...ctx, subscriptions: subs });
    expect(s.netProfit).toBe(37700);
    expect(s.turnover).toBeCloseTo(0.1); // 100,000 / 1,000,000
    expect(s.missed).toBe(1);
    expect(s.soldCount).toBe(1);
  });
  it('다른 달은 집계하지 않음', () => {
    const s = monthStats('2026-11', { ...ctx, subscriptions: [sub('i1', 'acc-a', { subscribed: true })] });
    expect(s.turnover).toBe(0);
    expect(s.missed).toBe(0);
  });
  it('배정 0주면 청약 수수료 없음', () => {
    const s = monthStats('2026-12', {
      ...ctx,
      subscriptions: [sub('i1', 'acc-a', { subscribed: true, allocatedQty: 0, sellPrice: 0, sellQty: 0 })],
    });
    expect(s.netProfit).toBe(0);
  });
});
