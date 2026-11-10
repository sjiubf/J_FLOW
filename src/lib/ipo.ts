import type { Broker, Ipo, IpoFields } from './types';

/** 수동 보정값이 수집값보다 우선한다. 값이 없으면 안전한 기본값. */
export function effective(ipo: Ipo): IpoFields {
  const m = { ...ipo.collected, ...ipo.manual };
  return {
    name: m.name ?? '(이름 없음)',
    type: m.type ?? 'general',
    offerPrice: m.offerPrice ?? null,
    subscribeStart: m.subscribeStart ?? null,
    subscribeEnd: m.subscribeEnd ?? null,
    refundDate: m.refundDate ?? null,
    listingDate: m.listingDate ?? null,
    underwriters: m.underwriters ?? [],
  };
}

/** 스팩 공모가는 2,000원 고정이 일반적이므로 미입력 시 기본값으로 사용 */
export const SPAC_DEFAULT_PRICE = 2000;

export function priceOf(f: IpoFields): number | null {
  if (f.offerPrice != null) return f.offerPrice;
  return f.type === 'spac' ? SPAC_DEFAULT_PRICE : null;
}

/** 계좌 1개당 필요한 증거금 = 공모가 × 최소 청약 주수 × 증거금률 (원 단위 올림) */
export function requiredMargin(price: number, broker: Pick<Broker, 'minUnits' | 'marginRate'>): number {
  return Math.ceil(price * broker.minUnits * broker.marginRate);
}
