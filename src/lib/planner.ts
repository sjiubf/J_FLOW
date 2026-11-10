import { effective, priceOf, requiredMargin } from './ipo';
import type { Account, Broker, Ipo, Subscription } from './types';

export interface PlanItem {
  account: Account;
  broker: Broker;
  margin: number;
}

export interface Plan {
  price: number | null;
  budget: number;
  /** 다른 종목에 묶여 있어 이 종목 기간에 쓸 수 없는 증거금 */
  lockedByOthers: number;
  conflicts: string[];
  available: number;
  /** 이미 청약 완료한 계좌 */
  done: PlanItem[];
  /** 지금 이체·청약하면 되는 계좌(우선순위 순) */
  picks: PlanItem[];
  /** 대상이지만 자금이 모자라 못 넣는 계좌 */
  overBudget: PlanItem[];
  /** 이 종목의 주관사·인수사가 아닌 계좌 */
  ineligible: Account[];
  totalMargin: number;
  remaining: number;
  warnings: string[];
}

/**
 * 증거금이 묶이는 구간은 [청약 마감일, 환불일) 로 본다.
 * 환불일 당일에는 자금이 풀려 같은 날 마감인 다음 종목에 쓸 수 있다고 가정한다(증권사별로 다를 수 있음).
 */
function lockWindow(ipo: Ipo): [string, string] | null {
  const f = effective(ipo);
  if (!f.subscribeEnd || !f.refundDate) return null;
  return [f.subscribeEnd, f.refundDate];
}

function overlaps(a: [string, string], b: [string, string]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

export function planMargin(input: {
  ipo: Ipo;
  ipos: Ipo[];
  brokers: Broker[];
  accounts: Account[];
  subscriptions: Subscription[];
  budget: number;
}): Plan {
  const { ipo, ipos, brokers, accounts, subscriptions, budget } = input;
  const f = effective(ipo);
  const price = priceOf(f);
  const warnings: string[] = [];
  const brokerById = new Map(brokers.map((b) => [b.id, b]));
  const myWindow = lockWindow(ipo);

  if (price == null) warnings.push('확정 공모가가 없어 증거금을 계산할 수 없어요.');
  if (!myWindow) warnings.push('청약 마감일 또는 환불일이 없어 자금 충돌을 확인할 수 없어요.');
  if (f.underwriters.length === 0) warnings.push('주관사·인수사가 비어 있어요.');

  // 다른 종목에 묶인 증거금
  let lockedByOthers = 0;
  const conflicts: string[] = [];
  if (myWindow) {
    for (const other of ipos) {
      if (other.id === ipo.id) continue;
      const w = lockWindow(other);
      if (!w || !overlaps(myWindow, w)) continue;
      const op = priceOf(effective(other));
      if (op == null) continue;
      let sum = 0;
      for (const s of subscriptions) {
        if (s.ipoId !== other.id || s.skipped) continue;
        if (!(s.transferred || s.subscribed) || s.refundChecked) continue;
        const acc = accounts.find((a) => a.id === s.accountId);
        const br = acc && brokerById.get(acc.brokerId);
        if (br) sum += requiredMargin(op, br);
      }
      if (sum > 0) {
        lockedByOthers += sum;
        conflicts.push(effective(other).name);
      }
    }
  }

  const available = Math.max(0, budget - lockedByOthers);
  const done: PlanItem[] = [];
  const candidates: PlanItem[] = [];
  const ineligible: Account[] = [];

  for (const account of accounts) {
    const broker = brokerById.get(account.brokerId);
    if (!broker) continue;
    if (!f.underwriters.includes(broker.id)) {
      ineligible.push(account);
      continue;
    }
    if (price == null) continue;
    const item: PlanItem = { account, broker, margin: requiredMargin(price, broker) };
    const sub = subscriptions.find((s) => s.ipoId === ipo.id && s.accountId === account.id);
    if (sub?.subscribed) done.push(item);
    else if (!sub?.skipped) candidates.push(item);
  }

  candidates.sort(
    (a, b) =>
      a.margin - b.margin ||
      a.broker.subscribeFee - b.broker.subscribeFee ||
      a.account.alias.localeCompare(b.account.alias),
  );

  let left = available - done.reduce((s, i) => s + i.margin, 0);
  const picks: PlanItem[] = [];
  const overBudget: PlanItem[] = [];
  for (const c of candidates) {
    if (c.margin <= left) {
      picks.push(c);
      left -= c.margin;
    } else {
      overBudget.push(c);
    }
  }
  if (overBudget.length > 0) warnings.push(`자금이 모자라 ${overBudget.length}개 계좌는 건너뛰어야 해요.`);

  const totalMargin = [...done, ...picks].reduce((s, i) => s + i.margin, 0);
  return {
    price,
    budget,
    lockedByOthers,
    conflicts,
    available,
    done,
    picks,
    overBudget,
    ineligible,
    totalMargin,
    remaining: Math.max(0, available - totalMargin),
    warnings,
  };
}
