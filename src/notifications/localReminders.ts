import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useData, useMine } from '../data/store';
import { addDays, todayKst } from '../lib/dates';
import { buildMessage, type Slot } from '../lib/notify';
import { buildTasks } from '../lib/todo';

/** 슬롯별 알림 시각(KST). 기기 시간대가 한국이라고 가정한다. */
const SLOT_TIME: Record<Slot, [number, number]> = { morning: [9, 0], evening: [18, 0], listing: [8, 30] };

/**
 * 앱 내 로컬 알림(보조). 카카오톡 알림이 실패해도 앱에서 받을 수 있게
 * 앞으로 7일 치 알림을 다시 예약한다. 웹에서는 동작하지 않는다.
 */
export function useLocalReminders() {
  const { ipos, brokers } = useData();
  const mine = useMine();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted || cancelled) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const start = todayKst();
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        const tasks = buildTasks({ today: day, ipos, brokers, accounts: mine.accounts, subscriptions: mine.subscriptions });
        for (const slot of Object.keys(SLOT_TIME) as Slot[]) {
          const body = buildMessage(slot, tasks, day);
          if (!body) continue;
          const [h, m] = SLOT_TIME[slot];
          const when = new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`);
          if (when.getTime() <= Date.now()) continue;
          await Notifications.scheduleNotificationAsync({
            content: { title: '공모픽', body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
        }
      }
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [ipos, brokers, mine.accounts, mine.subscriptions]);
}
