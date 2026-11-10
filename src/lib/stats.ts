import { monthOf } from './dates';
import { effective, priceOf, requiredMargin } from './ipo';
import type { Account, Broker, Ipo, Subscription } from './types';

export interface MonthStats {
  month: string;
  /** 순수익(원): 매도대금 − 공모가×수량 − 청약수수료 − 매도비용 */
  netProfit: number;
  /** 청약에 쓴 증거금 합계 ÷ 자금(회전 배수) */
  turnover: number;
  /** 청약 가능했는데 하지 않고 건너뛰지도 않은 (종목×계좌) 수 */
  missed: number;
  soldCount: number;
}

interface Ctx {
  ipos: Ipo[];
  brokers: Broker[];
  accounts: Account[];
  subscriptions: Subscription[];
  budget: number;
  today: string;
}

/** 매도까지 끝난 건의 순수익. 매도 전이면 null */
export function netProfitOf(sub: Subscription, offerPrice: number, subscribeFee: number): number | null {
  const qty = sub.sellQty ?? sub.allocatedQty;
  if (sub.sellPrice == null || qty == null) return null;
  return sub.sellPrice * qty - offerPrice * qty - subscribeFee - (sub.sellCosts ?? 0);
}

/** 월(YYYY-MM)은 상장일 기준으로 귀속한다. 상장일이 없으면 청약 마감일. */
function monthKey(ipo: Ipo): string | null {
  const f = effective(ipo);
  const d = f.listingDate ?? f.subscribeEnd;
  return d ? monthOf(d) : null;
}

export function monthStats(month: string, ctx: Ctx): MonthStats {
  const brokerById = new Map(ctx.brokers.map((b) => [b.id, b]));
  const accountById = new Map(ctx.accounts.map((a) => [a.id, a]));
  let netProfit = 0;
  let used = 0;
  let missed = 0;
  let soldCount = 0;

  for (const ipo of ctx.ipos) {
    if (monthKey(ipo) !== month) continue;
    const f = effective(ipo);
    const price = priceOf(f);

    for (const s of ctx.subscriptions.filter((x) => x.ipoId === ipo.id)) {
      const br = brokerById.get(accountById.get(s.accountId)?.brokerId ?? '');
      if (!br || price == null) continue;
      if (s.subscribed) used += requiredMargin(price, br);
      const fee = (s.allocatedQty ?? 0) > 0 ? br.subscribeFee : 0;
      const p = netProfitOf(s, price, fee);
      if (p != null) {
        netProfit += p;
        soldCount += 1;
      }
    }

    // 놓친 청약: 마감이 지났는데 대상 계좌가 청약도 건너뜀 표시도 없음
    if (f.subscribeEnd && f.subscribeEnd < ctx.today) {
      for (const a of ctx.accounts) {
        if (!f.underwriters.includes(a.brokerId)) continue;
        const s = ctx.subscriptions.find((x) => x.ipoId === ipo.id && x.accountId === a.id);
        if (!s?.subscribed && !s?.skipped) missed += 1;
      }
    }
  }
  return { month, netProfit, turnover: ctx.budget > 0 ? used / ctx.budget : 0, missed, soldCount };
}

export const won = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;
