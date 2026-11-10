/** 날짜는 모두 'YYYY-MM-DD' (KST 기준) 문자열로 다룬다. */
export type IpoType = 'general' | 'spac';

export interface Broker {
  id: string;
  name: string;
  /** 균등 청약 최소 주수 (기본 10) */
  minUnits: number;
  /** 증거금률 (기본 0.5) */
  marginRate: number;
  /** 배정받았을 때 청약 수수료(원). 증권사 공지 기준으로 직접 입력 */
  subscribeFee: number;
}

export interface IpoFields {
  name: string;
  type: IpoType;
  /** 확정 공모가(원). 미정이면 null */
  offerPrice: number | null;
  subscribeStart: string | null;
  subscribeEnd: string | null;
  refundDate: string | null;
  listingDate: string | null;
  /** 주관사·인수사 broker id 목록 */
  underwriters: string[];
}

export interface Ipo {
  id: string;
  /** DART 등에서 자동 수집한 값 */
  collected: Partial<IpoFields>;
  /** 사람이 보정한 값(수집값보다 우선) */
  manual: Partial<IpoFields>;
  dartRceptNo?: string;
  updatedBy?: string;
  updatedAt?: number;
}

export interface Account {
  id: string;
  brokerId: string;
  alias: string;
}

export interface Subscription {
  id: string; // `${ipoId}_${accountId}`
  ipoId: string;
  accountId: string;
  transferred: boolean;
  subscribed: boolean;
  /** 자금 부족 등으로 의도적으로 건너뜀 → '놓친 청약'에서 제외 */
  skipped: boolean;
  refundChecked: boolean;
  allocatedQty: number | null;
  sellPrice: number | null;
  sellQty: number | null;
  /** 매도 수수료·세금 합계(원), 직접 입력 */
  sellCosts: number | null;
  memo: string;
}

export const emptySubscription = (ipoId: string, accountId: string): Subscription => ({
  id: `${ipoId}_${accountId}`,
  ipoId,
  accountId,
  transferred: false,
  subscribed: false,
  skipped: false,
  refundChecked: false,
  allocatedQty: null,
  sellPrice: null,
  sellQty: null,
  sellCosts: null,
  memo: '',
});
