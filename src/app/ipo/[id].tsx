import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Chip, Body, Btn, Card, Field, H2, Notice, Row, Screen, Sub, colors } from '../../components/ui';
import { NumField } from '../../components/NumField';
import { useData, useMine } from '../../data/store';
import { isValidDate } from '../../lib/dates';
import { md, parseNum, won } from '../../lib/format';
import { effective, priceOf } from '../../lib/ipo';
import { planMargin } from '../../lib/planner';
import { netProfitOf } from '../../lib/stats';
import type { IpoFields, IpoType } from '../../lib/types';

const DATE_KEYS = ['subscribeStart', 'subscribeEnd', 'refundDate', 'listingDate'] as const;
const DATE_LABEL: Record<(typeof DATE_KEYS)[number], string> = {
  subscribeStart: '청약 시작', subscribeEnd: '청약 마감', refundDate: '환불일', listingDate: '상장일',
};

export default function IpoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const data = useData();
  const mine = useMine();
  const ipo = data.ipos.find((i) => i.id === id);
  const f = ipo ? effective(ipo) : null;

  // ── 종목 정보 폼
  const [name, setName] = useState('');
  const [type, setType] = useState<IpoType>('general');
  const [price, setPrice] = useState('');
  const [dates, setDates] = useState<Record<string, string>>({});
  const [uw, setUw] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!f) return;
    setName(f.name === '(이름 없음)' ? '' : f.name);
    setType(f.type);
    setPrice(f.offerPrice == null ? '' : String(f.offerPrice));
    setDates(Object.fromEntries(DATE_KEYS.map((k) => [k, f[k] ?? ''])));
    setUw(f.underwriters);
    // 서버 값이 바뀔 때만 폼을 다시 채운다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipo?.updatedAt, ipo?.id]);

  const save = async () => {
    setMsg('');
    for (const k of DATE_KEYS) {
      if (dates[k] && !isValidDate(dates[k])) return setMsg(`${DATE_LABEL[k]} 날짜 형식은 YYYY-MM-DD 예요.`);
    }
    if (!name.trim()) return setMsg('종목명을 입력하세요.');
    const next: IpoFields = {
      name: name.trim(), type, offerPrice: parseNum(price),
      subscribeStart: dates.subscribeStart || null, subscribeEnd: dates.subscribeEnd || null,
      refundDate: dates.refundDate || null, listingDate: dates.listingDate || null,
      underwriters: uw,
    };
    // 수집값과 같은 필드는 manual 에서 빼서, 이후 수집 갱신이 계속 반영되게 한다.
    const collected = ipo?.collected ?? {};
    const manual: Partial<IpoFields> = {};
    for (const key of Object.keys(next) as (keyof IpoFields)[]) {
      if (JSON.stringify(next[key]) !== JSON.stringify(collected[key])) (manual as Record<string, unknown>)[key] = next[key];
    }
    try {
      const newId = await data.saveIpo(isNew ? null : id, manual);
      setMsg('저장했어요.');
      if (isNew) router.replace({ pathname: '/ipo/[id]', params: { id: newId } });
    } catch (e) {
      setMsg(String((e as Error).message));
    }
  };

  // ── 증거금 플랜(내 계좌 기준)
  const plan = useMemo(
    () => (ipo ? planMargin({ ipo, ipos: data.ipos, brokers: data.brokers, accounts: mine.accounts, subscriptions: mine.subscriptions, budget: mine.budget }) : null),
    [ipo, data.ipos, data.brokers, mine.accounts, mine.subscriptions, mine.budget],
  );

  const brokerById = new Map(data.brokers.map((b) => [b.id, b]));
  const myEligible = f ? mine.accounts.filter((a) => f.underwriters.includes(a.brokerId)) : [];
  const offer = f ? priceOf(f) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? '공모주 추가' : (f?.name ?? '종목') }} />

      <Card>
        <H2>종목 정보</H2>
        {ipo && Object.keys(ipo.collected).length > 0 && <Sub>DART에서 자동 수집된 값이 있어요. 직접 고친 값이 우선합니다.</Sub>}
        <Field label="종목명" value={name} onChangeText={setName} />
        <Row style={{ marginBottom: 10 }}>
          <Chip label="일반 공모주" active={type === 'general'} onPress={() => setType('general')} />
          <Chip label="스팩" active={type === 'spac'} onPress={() => setType('spac')} />
        </Row>
        <Field label={`확정 공모가(원)${type === 'spac' ? ' — 비우면 2,000원' : ''}`} value={price} onChangeText={setPrice} keyboardType="numeric" />
        {DATE_KEYS.map((k) => (
          <Field key={k} label={`${DATE_LABEL[k]} (YYYY-MM-DD)`} value={dates[k] ?? ''} placeholder="2026-11-25" onChangeText={(t) => setDates((d) => ({ ...d, [k]: t }))} />
        ))}
        <Sub>주관사·인수사 (청약 가능한 증권사)</Sub>
        <Row>
          {[...data.brokers].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
            <Chip key={b.id} label={b.name} active={uw.includes(b.id)} onPress={() => setUw((u) => (u.includes(b.id) ? u.filter((x) => x !== b.id) : [...u, b.id]))} />
          ))}
        </Row>
        {msg ? <Notice kind={msg === '저장했어요.' ? 'ok' : 'bad'}>{msg}</Notice> : null}
        <Btn label={isNew ? '추가' : '저장'} onPress={save} />
        {ipo?.updatedBy && <Sub>마지막 수정: {data.members.find((m) => m.uid === ipo.updatedBy)?.name ?? '가족'}</Sub>}
      </Card>

      {!isNew && ipo && f && plan && (
        <>
          <Card>
            <H2>증거금 플래너 (내 자금 {won(mine.budget)})</H2>
            {plan.price != null && <Sub>공모가 {won(plan.price)} 기준, 계좌당 필요 증거금은 증권사별 최소 청약 주수에 따라 달라요.</Sub>}
            {plan.warnings.map((w, i) => <Notice key={i} kind="warn">{w}</Notice>)}
            {plan.conflicts.length > 0 && (
              <Notice kind="warn">{plan.conflicts.join(', ')} 에 {won(plan.lockedByOthers)}이 묶여 있어 사용 가능 자금은 {won(plan.available)} 이에요.</Notice>
            )}
            {plan.picks.length > 0 && <Body bold>이체 후 청약할 계좌 ({won(plan.picks.reduce((s, p) => s + p.margin, 0))})</Body>}
            {plan.picks.map((p) => (
              <Sub key={p.account.id}>• {p.broker.name}({p.account.alias}) — {won(p.margin)}</Sub>
            ))}
            {plan.done.length > 0 && <Sub color={colors.ok}>청약 완료 {plan.done.length}개 · {won(plan.done.reduce((s, p) => s + p.margin, 0))}</Sub>}
            {plan.overBudget.map((p) => (
              <Sub key={p.account.id} color={colors.warn}>자금 부족: {p.broker.name}({p.account.alias}) — {won(p.margin)}</Sub>
            ))}
            <Sub>청약 후 남는 자금 {won(plan.remaining)}</Sub>
          </Card>

          <H2>내 계좌 진행 상태</H2>
          {myEligible.length === 0 && <Card><Sub>이 종목의 주관사·인수사에 해당하는 내 계좌가 없어요.</Sub></Card>}
          {myEligible.map((a) => {
            const s = data.subscriptions.find((x) => x.ipoId === ipo.id && x.accountId === a.id);
            const set = (patch: Parameters<typeof data.saveSubscription>[2]) => data.saveSubscription(ipo.id, a.id, patch);
            const br = brokerById.get(a.brokerId);
            const fee = (s?.allocatedQty ?? 0) > 0 ? (br?.subscribeFee ?? 0) : 0;
            const profit = s && offer != null ? netProfitOf(s, offer, fee) : null;
            return (
              <Card key={a.id}>
                <Body bold>{br?.name} ({a.alias})</Body>
                <Row>
                  <Check label="이체" value={!!s?.transferred} onChange={(v) => set({ transferred: v })} />
                  <Check label="청약 완료" value={!!s?.subscribed} onChange={(v) => set({ subscribed: v, ...(v ? { transferred: true, skipped: false } : {}) })} />
                  <Check label="건너뜀" value={!!s?.skipped} onChange={(v) => set({ skipped: v })} />
                  <Check label="환불 확인" value={!!s?.refundChecked} onChange={(v) => set({ refundChecked: v })} />
                </Row>
                <NumField label="배정 수량(주)" value={s?.allocatedQty ?? null} onCommit={(n) => set({ allocatedQty: n })} />
                <NumField label="매도가(주당, 원)" value={s?.sellPrice ?? null} onCommit={(n) => set({ sellPrice: n })} />
                <NumField label="매도 수량(비우면 배정 수량)" value={s?.sellQty ?? null} onCommit={(n) => set({ sellQty: n })} />
                <NumField label="매도 수수료·세금 합계(원)" value={s?.sellCosts ?? null} onCommit={(n) => set({ sellCosts: n })} />
                <Field label="메모" defaultValue={s?.memo ?? ''} onEndEditing={(e) => { const t = e.nativeEvent.text; if (t !== (s?.memo ?? '')) void set({ memo: t }); }} />
                {profit != null && <Body bold>순수익 {won(profit)}</Body>}
              </Card>
            );
          })}

          <H2>가족 현황</H2>
          {data.members.filter((m) => m.uid !== data.me?.uid).map((m) => {
            const subs = data.subscriptions.filter((x) => x.ipoId === ipo.id && x.ownerUid === m.uid);
            const done = subs.filter((x) => x.subscribed).length;
            const alloc = subs.reduce((n, x) => n + (x.allocatedQty ?? 0), 0);
            return <Card key={m.uid}><Body bold>{m.name}</Body><Sub>청약 완료 {done}개 · 배정 {alloc}주</Sub></Card>;
          })}
          {data.members.length <= 1 && <Card><Sub>다른 가족이 합류하면 여기에 진행 현황이 보여요.</Sub></Card>}

          {data.isAdmin && (
            <Btn kind="danger" label="이 종목 삭제" onPress={async () => { await data.deleteIpo(ipo.id); router.back(); }} />
          )}
          <Sub>일정: 청약 {md(f.subscribeStart)} ~ {md(f.subscribeEnd)} · 환불 {md(f.refundDate)} · 상장 {md(f.listingDate)}</Sub>
        </>
      )}
    </Screen>
  );
}
