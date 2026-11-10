import React, { useState } from 'react';
import { signOutAll } from '../../auth/google';
import { Body, Btn, Card, Chip, Field, H1, H2, Notice, Row, Screen, Sub } from '../../components/ui';
import { NumField } from '../../components/NumField';
import { MAX_MEMBERS, useData, useMine } from '../../data/store';
import { won } from '../../lib/format';

export default function Settings() {
  const data = useData();
  const mine = useMine();
  const [brokerId, setBrokerId] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const run = (p: Promise<unknown>) => p.then(() => setMsg('')).catch((e) => setMsg(String(e?.message ?? e)));
  const sorted = [...data.brokers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen>
      <H1>설정</H1>
      {msg ? <Notice kind="bad">{msg}</Notice> : null}

      <Card>
        <H2>내 자금</H2>
        <NumField label="증거금 운용 자금(원)" value={mine.budget} onCommit={(n) => n != null && run(data.setBudget(n))} />
        <Sub>플래너가 이 금액 안에서 계좌를 추천해요. 현재 {won(mine.budget)}</Sub>
      </Card>

      <Card>
        <H2>내 계좌</H2>
        <Sub>계좌번호·비밀번호·잔고는 저장하지 않아요. 증권사와 별칭만 등록하세요.</Sub>
        {mine.accounts.map((a) => (
          <Row key={a.id} style={{ justifyContent: 'space-between' }}>
            <Body>{data.brokers.find((b) => b.id === a.brokerId)?.name ?? a.brokerId} ({a.alias})</Body>
            <Btn kind="danger" label="삭제" onPress={() => run(data.deleteAccount(a.id))} />
          </Row>
        ))}
        <Sub>증권사 선택</Sub>
        <Row>{sorted.map((b) => <Chip key={b.id} label={b.name} active={brokerId === b.id} onPress={() => setBrokerId(b.id)} />)}</Row>
        <Field label="별칭 (예: 주계좌, 아내 명의)" value={alias} onChangeText={setAlias} />
        <Btn label="계좌 추가" disabled={!brokerId || !alias.trim()} onPress={() => run(data.addAccount(brokerId, alias.trim()).then(() => { setAlias(''); setBrokerId(''); }))} />
      </Card>

      <Card>
        <H2>가족 ({data.household?.memberEmails.length}/{MAX_MEMBERS})</H2>
        {data.household?.memberEmails.map((e) => (
          <Row key={e} style={{ justifyContent: 'space-between' }}>
            <Body>{e}{data.members.find((m) => m.email === e)?.uid === data.household?.adminUid ? ' · 관리자' : ''}</Body>
            {data.isAdmin && e !== data.me?.email && <Btn kind="danger" label="제거" onPress={() => run(data.removeMemberEmail(e))} />}
          </Row>
        ))}
        {data.isAdmin ? (
          <>
            <Field label="가족 Google 이메일 추가" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Btn label="추가" disabled={!email.includes('@')} onPress={() => run(data.addMemberEmail(email).then(() => setEmail('')))} />
            <Sub>등록된 이메일로 로그인하면 자동으로 그룹에 합류해요.</Sub>
          </>
        ) : <Sub>가족 관리는 관리자만 할 수 있어요.</Sub>}
      </Card>

      <Card>
        <H2>증권사 설정</H2>
        <Sub>최소 청약 주수·증거금률·청약 수수료는 증권사 공지를 보고 직접 확인해 입력하세요. 모든 가족이 공유해요.</Sub>
        {sorted.map((b) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{b.name}</Body>
              <Btn kind="ghost" label={open === b.id ? '닫기' : '수정'} onPress={() => setOpen(open === b.id ? null : b.id)} />
            </Row>
            <Sub>최소 {b.minUnits}주 · 증거금률 {Math.round(b.marginRate * 100)}% · 수수료 {won(b.subscribeFee)}</Sub>
            {open === b.id && (
              <>
                <NumField label="최소 청약 주수" value={b.minUnits} onCommit={(n) => n != null && n > 0 && run(data.saveBroker({ ...b, minUnits: n }))} />
                <NumField label="증거금률(%)" value={Math.round(b.marginRate * 100)} onCommit={(n) => n != null && n > 0 && n <= 100 && run(data.saveBroker({ ...b, marginRate: n / 100 }))} />
                <NumField label="배정 시 청약 수수료(원)" value={b.subscribeFee} onCommit={(n) => n != null && n >= 0 && run(data.saveBroker({ ...b, subscribeFee: n }))} />
              </>
            )}
          </Card>
        ))}
      </Card>

      <Card>
        <H2>알림</H2>
        <Sub>카카오톡 알림은 GitHub Actions가 보내요(청약 마감일 9시, 전날 18시 이체, 환불일 9시, 상장일 8시 30분). 연동 방법은 docs/SETUP.md 를 보세요. 앱 내 알림은 보조로 앞으로 7일 치가 예약돼요(Android).</Sub>
      </Card>

      <Card>
        <H2>안내</H2>
        <Sub>이 앱의 계산(증거금, 수수료, 순수익)은 참고용이며 투자 권유나 세금 신고 자료가 아니에요. 청약 일정과 공모가는 반드시 증권사 공고로 확인하세요.</Sub>
      </Card>

      <Btn kind="ghost" label="로그아웃" onPress={() => run(signOutAll())} />
    </Screen>
  );
}
