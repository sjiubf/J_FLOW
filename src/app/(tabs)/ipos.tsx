import { Link, router } from 'expo-router';
import React from 'react';
import { Body, Btn, Card, H1, Screen, Sub } from '../../components/ui';
import { useData } from '../../data/store';
import { todayKst } from '../../lib/dates';
import { md } from '../../lib/format';
import { effective } from '../../lib/ipo';

export default function Ipos() {
  const { ipos } = useData();
  const today = todayKst();
  const sorted = [...ipos].sort((a, b) => (effective(b).subscribeEnd ?? '9999').localeCompare(effective(a).subscribeEnd ?? '9999'));
  const upcoming = sorted.filter((i) => (effective(i).subscribeEnd ?? '9999') >= today).reverse();
  const past = sorted.filter((i) => (effective(i).subscribeEnd ?? '9999') < today);

  const item = (id: string) => {
    const ipo = ipos.find((i) => i.id === id)!;
    const f = effective(ipo);
    return (
      <Link key={id} href={{ pathname: '/ipo/[id]', params: { id } }} asChild>
        <Card>
          <Body bold>{f.name}{f.type === 'spac' ? ' · 스팩' : ''}</Body>
          <Sub>청약 {md(f.subscribeStart)} ~ {md(f.subscribeEnd)} · 환불 {md(f.refundDate)} · 상장 {md(f.listingDate)}</Sub>
          {Object.keys(ipo.collected).length > 0 && <Sub>DART 수집 {ipo.dartRceptNo ? `(${ipo.dartRceptNo})` : ''}</Sub>}
        </Card>
      </Link>
    );
  };

  return (
    <Screen>
      <H1>종목</H1>
      <Btn label="＋ 공모주 추가" onPress={() => router.push({ pathname: '/ipo/[id]', params: { id: 'new' } })} />
      <Sub>예정·진행 중</Sub>
      {upcoming.length === 0 && <Card><Sub>없음</Sub></Card>}
      {upcoming.map((i) => item(i.id))}
      <Sub>지난 종목</Sub>
      {past.length === 0 && <Card><Sub>없음</Sub></Card>}
      {past.map((i) => item(i.id))}
    </Screen>
  );
}
