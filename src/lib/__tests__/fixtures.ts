import type { Account, Broker, Ipo, Subscription } from '../types';
import { emptySubscription } from '../types';

export const brokers: Broker[] = [
  { id: 'a', name: 'A증권', minUnits: 10, marginRate: 0.5, subscribeFee: 2000 },
  { id: 'b', name: 'B증권', minUnits: 10, marginRate: 0.5, subscribeFee: 0 },
  { id: 'c', name: 'C증권', minUnits: 10, marginRate: 0.5, subscribeFee: 0 },
];

export const accounts: Account[] = [
  { id: 'acc-a', brokerId: 'a', alias: '주계좌' },
  { id: 'acc-b', brokerId: 'b', alias: '주계좌' },
  { id: 'acc-c', brokerId: 'c', alias: '주계좌' },
];

export const mkIpo = (id: string, m: Partial<Ipo['manual']>): Ipo => ({ id, collected: {}, manual: m });

/** 공모가 20,000원 → 계좌당 증거금 100,000원 */
export const ipo1 = mkIpo('i1', {
  name: '가나다', type: 'general', offerPrice: 20000,
  subscribeStart: '2026-11-24', subscribeEnd: '2026-11-25', refundDate: '2026-11-27', listingDate: '2026-12-03',
  underwriters: ['a', 'b'],
});

export const sub = (ipoId: string, accountId: string, p: Partial<Subscription> = {}): Subscription => ({
  ...emptySubscription(ipoId, accountId),
  ...p,
});
