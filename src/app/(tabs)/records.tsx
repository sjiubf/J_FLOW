import React, { useState } from 'react';
import { Body, Btn, Card, colors, H1, H2, Row, Screen, Sub } from '../../components/ui';
import { useData, useMine } from '../../data/store';
import { addDays, todayKst } from '../../lib/dates';
import { monthStats, won } from '../../lib/stats';

const shiftMonth = (m: string, n: number) => {
  const d = addDays(`${m}-15`, n * 30);
  return d.slice(0, 7);
};

function StatRow({ s }: { s: ReturnType<typeof monthStats> }) {
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Sub>월 누적 순수익</Sub>
        <Body bold>{won(s.netProfit)}</Body>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Sub>자금 회전율</Sub>
        <Body bold>{s.turnover.toFixed(2)}회전</Body>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Sub>놓친 청약</Sub>
        <Body bold>{s.missed}건</Body>
      </Row>
      <Sub>매도 기록 {s.soldCount}건</Sub>
    </>
  );
}

export default function Records() {
  const { ipos, brokers, accounts, subscriptions, members } = useData();
  const mine = useMine();
  const today = todayKst();
  const [month, setMonth] = useState(today.slice(0, 7));

  const mineStats = monthStats(month, { ipos, brokers, accounts: mine.accounts, subscriptions: mine.subscriptions, budget: mine.budget, today });
  const totalBudget = members.reduce((s, m) => s + m.budget, 0);
  const family = monthStats(month, { ipos, brokers, accounts, subscriptions, budget: totalBudget, today });

  return (
    <Screen>
      <H1>기록</H1>
      <Row style={{ justifyContent: 'space-between' }}>
        <Btn label="◀" kind="ghost" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
        <H2>{month}</H2>
        <Btn label="▶" kind="ghost" onPress={() => setMonth((m) => shiftMonth(m, 1))} />
      </Row>
      <Sub>월은 상장일(없으면 청약 마감일) 기준으로 집계해요.</Sub>

      <Card><H2>나</H2><StatRow s={mineStats} /></Card>
      <Card><H2>가족 합산 (자금 {won(totalBudget)})</H2><StatRow s={family} /></Card>

      <H2>가족별</H2>
      {members.map((m) => {
        const s = monthStats(month, {
          ipos, brokers, today, budget: m.budget,
          accounts: accounts.filter((a) => a.ownerUid === m.uid),
          subscriptions: subscriptions.filter((x) => x.ownerUid === m.uid),
        });
        return (
          <Card key={m.uid}>
            <Body bold>{m.name}</Body>
            <Sub color={s.netProfit < 0 ? colors.bad : undefined}>
              순수익 {won(s.netProfit)} · 회전 {s.turnover.toFixed(2)} · 놓침 {s.missed}건
            </Sub>
          </Card>
        );
      })}
      <Sub>※ 앱의 계산은 참고용이며 세금 신고용이 아니에요.</Sub>
    </Screen>
  );
}
