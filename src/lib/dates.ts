/** 'YYYY-MM-DD' 날짜 유틸. 시간대 문제를 피하려 UTC 정오 기준으로 계산한다. */
const toUtc = (d: string) => new Date(`${d}T12:00:00Z`);

export function addDays(d: string, n: number): string {
  const t = toUtc(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000);
}

/** 현재 시각의 KST 날짜 */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function monthOf(d: string): string {
  return d.slice(0, 7);
}

export function isValidDate(d: string | null | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(toUtc(d).getTime());
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayKo(d: string): string {
  return WEEK[toUtc(d).getUTCDay()];
}
