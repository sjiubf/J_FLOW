import { Link } from 'expo-router';
import React from 'react';
import { Body, Btn, Card, colors, H1, H2, Notice, Row, Screen, Sub } from '../../components/ui';
import { useData, useMine } from '../../data/store';
import { todayKst } from '../../lib/dates';
import { md, won } from '../../lib/format';
import { effective } from '../../lib/ipo';
import { planMargin } from '../../lib/planner';
import { buildTasks } from '../../lib/todo';

const KIND_ICON = { transfer: '💸', subscribe: '📝', refund: '↩️', allocation: '🔢', listing: '🔔' } as const;

export default function Home() {
  const { ipos, brokers, me } = useData();
  const mine = useMine();
  const today = todayKst();
  const tasks = buildTasks({ today, ipos, brokers, accounts: mine.accounts, subscriptions: mine.subscriptions });

  // 진행 중인(청약 마감이 오늘 이후인) 종목의 증거금 요약
  const open = ipos
    .filter((i) => { const f = effective(i); return !!f.subscribeEnd && f.subscribeEnd >= today; })
    .sort((a, b) => (effective(a).subscribeEnd ?? '').localeCompare(effective(b).subscribeEnd ?? ''));

  return (
    <Screen>
      <H1>안녕하세요, {me?.name ?? ''}님</H1>
      <Sub>{today} · 내 자금 {won(mine.budget)}</Sub>

      {mine.accounts.length === 0 && (
        <Notice kind="warn">아직 등록한 계좌가 없어요. 설정 탭에서 증권사 계좌(별칭)를 추가하세요.</Notice>
      )}

      <H2>오늘 할 일</H2>
      {tasks.length === 0 ? (
        <Card><Body>오늘 할 일이 없어요 🎉</Body></Card>
      ) : (
        tasks.map((t, i) => (
          <Link key={i} href={{ pathname: '/ipo/[id]', params: { id: t.ipoId } }} asChild>
            <Card>
              <Body bold>{KIND_ICON[t.kind]} {t.ipoName}</Body>
              <Sub>{t.text}</Sub>
            </Card>
          </Link>
        ))
      )}

      <H2>진행 중인 공모주</H2>
      {open.length === 0 && <Card><Sub>종목 탭에서 공모주를 추가하세요.</Sub></Card>}
      {open.map((ipo) => {
        const f = effective(ipo);
        const plan = planMargin({ ipo, ipos, brokers, accounts: mine.accounts, subscriptions: mine.subscriptions, budget: mine.budget });
        return (
          <Link key={ipo.id} href={{ pathname: '/ipo/[id]', params: { id: ipo.id } }} asChild>
            <Card>
              <Body bold>{f.name} {f.type === 'spac' ? '· 스팩' : ''}</Body>
              <Sub>청약 마감 {md(f.subscribeEnd)} · 환불 {md(f.refundDate)} · 상장 {md(f.listingDate)}</Sub>
              <Row>
                <Sub color={colors.primary}>이체 대상 {plan.picks.length}개</Sub>
                <Sub>필요 증거금 {won(plan.picks.reduce((s, p) => s + p.margin, 0))}</Sub>
                {plan.overBudget.length > 0 && <Sub color={colors.warn}>자금 부족 {plan.overBudget.length}개</Sub>}
              </Row>
            </Card>
          </Link>
        );
      })}
      <Link href="/ipos" asChild><Btn label="종목 전체 보기" kind="ghost" onPress={() => undefined} /></Link>
    </Screen>
  );
}
