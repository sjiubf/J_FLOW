import type { Task } from './todo';

export type Slot = 'morning' | 'evening' | 'listing';

/** 알림 시각(KST): morning 09:00, evening 18:00(전날 이체), listing 08:30(상장일) */
export const SLOT_LABEL: Record<Slot, string> = {
  morning: '오전 9시',
  evening: '오후 6시',
  listing: '오전 8시 30분',
};

export function tasksForSlot(slot: Slot, tasks: Task[]): Task[] {
  switch (slot) {
    case 'morning':
      return tasks.filter((t) => t.kind === 'subscribe' || t.kind === 'refund' || t.kind === 'allocation');
    case 'evening':
      return tasks.filter((t) => t.kind === 'transfer' || (t.kind === 'listing' && t.day === 'tomorrow'));
    case 'listing':
      return tasks.filter((t) => t.kind === 'listing' && t.day === 'today');
  }
}

/** 카카오톡으로 보낼 본문. 보낼 게 없으면 null (빈 알림은 보내지 않는다) */
export function buildMessage(slot: Slot, tasks: Task[], today: string): string | null {
  const list = tasksForSlot(slot, tasks);
  if (list.length === 0) return null;
  const lines = list.map((t) => `• [${t.ipoName}] ${t.text}`);
  return [`공모픽 ${SLOT_LABEL[slot]} 알림 (${today})`, ...lines].join('\n');
}
