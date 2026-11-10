import { Link } from 'expo-router';
import React from 'react';
import { Body, Card, H1, H2, Screen, Sub } from '../../components/ui';
import { useData } from '../../data/store';
import { addDays, todayKst } from '../../lib/dates';
import { md } from '../../lib/format';
import { effective } from '../../lib/ipo';

type Ev = { date: string; label: string; ipoId: string; name: string };

/** 앞으로 60일의 일정을 날짜별로 묶어 보여 준다(아젠다 형식). */
export default function CalendarScreen() {
  const { ipos } = useData();
  const today = todayKst();
  const end = addDays(today, 60);
  const events: Ev[] = [];
  for (const ipo of ipos) {
    const f = effective(ipo);
    const add = (date: string | null, label: string) => {
      if (date && date >= today && date <= end) events.push({ date, label, ipoId: ipo.id, name: f.name });
    };
    add(f.subscribeStart, '청약 시작');
    add(f.subscribeEnd, '청약 마감');
    add(f.refundDate, '환불');
    add(f.listingDate, '상장');
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map<string, Ev[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <Screen>
      <H1>캘린더</H1>
      <Sub>오늘부터 60일</Sub>
      {byDate.size === 0 && <Card><Sub>예정된 일정이 없어요.</Sub></Card>}
      {[...byDate.entries()].map(([date, list]) => (
        <Card key={date}>
          <H2>{md(date)}{date === today ? ' · 오늘' : ''}</H2>
          {list.map((e, i) => (
            <Link key={i} href={{ pathname: '/ipo/[id]', params: { id: e.ipoId } }}><Body>{e.label} — {e.name}</Body></Link>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
