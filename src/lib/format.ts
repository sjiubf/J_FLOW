import { weekdayKo } from './dates';
export { won } from './stats';

export const md = (d: string | null | undefined) => (d ? `${d.slice(5).replace('-', '/')}(${weekdayKo(d)})` : '미정');

/** 숫자 입력 문자열 → number | null */
export function parseNum(s: string): number | null {
  const t = s.replace(/[,\s원]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
