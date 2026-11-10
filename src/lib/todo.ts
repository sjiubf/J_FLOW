import { addDays } from './dates';
import { effective } from './ipo';
import type { Account, Broker, Ipo, Subscription } from './types';

export type TaskKind = 'transfer' | 'subscribe' | 'refund' | 'allocation' | 'listing';

export interface Task {
  kind: TaskKind;
  ipoId: string;
  ipoName: string;
  /** 사람이 읽는 한 줄 */
  text: string;
  /** 정렬 우선순위(작을수록 먼저) */
  order: number;
  /** 상장 알림에서만 사용: 오늘 상장인지 내일 상장인지 */
  day?: 'today' | 'tomorrow';
}

export interface TodoInput {
  today: string;
  ipos: Ipo[];
  brokers: Broker[];
  accounts: Account[];
  subscriptions: Subscription[];
}

/** 내 계좌 기준 '오늘 할 일' 목록 */
export function buildTasks(input: TodoInput): Task[] {
  const { today, ipos, brokers, accounts, subscriptions } = input;
  const brokerName = new Map(brokers.map((b) => [b.id, b.name]));
  const tasks: Task[] = [];
  const tomorrow = addDays(today, 1);

  for (const ipo of ipos) {
    const f = effective(ipo);
    const eligible = accounts.filter((a) => f.underwriters.includes(a.brokerId));
    const sub = (a: Account) => subscriptions.find((s) => s.ipoId === ipo.id && s.accountId === a.id);
    const names = (list: Account[]) => list.map((a) => `${brokerName.get(a.brokerId) ?? a.brokerId}(${a.alias})`).join(', ');
    const push = (kind: TaskKind, order: number, text: string, day?: 'today' | 'tomorrow') =>
      tasks.push({ kind, ipoId: ipo.id, ipoName: f.name, text, order, day });

    // 청약 마감 당일: 미청약 계좌
    if (f.subscribeEnd === today) {
      const todo = eligible.filter((a) => !sub(a)?.subscribed && !sub(a)?.skipped);
      if (todo.length) push('subscribe', 1, `오늘 청약 마감 — 미청약 ${todo.length}개: ${names(todo)}`);
    }
    // 전날: 증거금 이체 필요 계좌
    if (f.subscribeEnd === tomorrow) {
      const todo = eligible.filter((a) => !sub(a)?.transferred && !sub(a)?.subscribed && !sub(a)?.skipped);
      if (todo.length) push('transfer', 0, `내일 청약 마감 — 증거금 이체 ${todo.length}개: ${names(todo)}`);
    }
    // 환불일: 청약한 계좌 중 환불 미확인
    if (f.refundDate && f.refundDate <= today) {
      const todo = eligible.filter((a) => sub(a)?.subscribed && !sub(a)?.refundChecked);
      if (todo.length) push('refund', 2, `환불 확인 ${todo.length}개: ${names(todo)}`);
    }
    // 환불일 이후: 배정 수량 미입력
    if (f.refundDate && f.refundDate <= today) {
      const todo = eligible.filter((a) => sub(a)?.subscribed && sub(a)?.allocatedQty == null);
      if (todo.length) push('allocation', 3, `배정 수량 입력 ${todo.length}개: ${names(todo)}`);
    }
    // 상장일 전날·당일: 배정받은 계좌가 있을 때
    if (f.listingDate === today || f.listingDate === tomorrow) {
      const held = eligible.filter((a) => (sub(a)?.allocatedQty ?? 0) > 0 && sub(a)?.sellPrice == null);
      if (held.length) {
        const when = f.listingDate === today ? '오늘 상장' : '내일 상장';
        push('listing', 4, `${when} — 배정 보유 ${held.length}개. 매도 후 매도가를 기록하세요`, f.listingDate === today ? 'today' : 'tomorrow');
      }
    }
  }
  return tasks.sort((a, b) => a.order - b.order || a.ipoName.localeCompare(b.ipoName));
}
