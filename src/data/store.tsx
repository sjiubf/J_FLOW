import {
  collection, doc, onSnapshot, query, serverTimestamp, setDoc, deleteDoc, updateDoc, where, writeBatch, arrayRemove, arrayUnion,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/client';
import { BROKER_SEEDS } from '../lib/brokers';
import type { Account, Broker, Ipo, IpoFields, Subscription } from '../lib/types';
import { emptySubscription } from '../lib/types';

export interface Household {
  id: string;
  name: string;
  adminUid: string;
  memberEmails: string[];
}
export interface Member {
  uid: string;
  email: string;
  name: string;
  /** 1인당 증거금 운용 자금(원) */
  budget: number;
}
export type OwnedAccount = Account & { ownerUid: string };
export type OwnedSubscription = Subscription & { ownerUid: string };

export const DEFAULT_BUDGET = 1_000_000;
export const MAX_MEMBERS = 4;

interface DataState {
  ready: boolean;
  /** 로그인했지만 소속 가족 그룹이 없음 */
  needsHousehold: boolean;
  household: Household | null;
  me: Member | null;
  members: Member[];
  brokers: Broker[];
  ipos: Ipo[];
  accounts: OwnedAccount[];
  subscriptions: OwnedSubscription[];
  isAdmin: boolean;
  createHousehold: (name: string) => Promise<void>;
  /** manual 은 통째로 교체된다(수집값과 같은 필드는 빼서 보내면 수집값이 계속 반영됨) */
  saveIpo: (id: string | null, manual: Partial<IpoFields>) => Promise<string>;
  deleteIpo: (id: string) => Promise<void>;
  saveBroker: (b: Broker) => Promise<void>;
  addAccount: (brokerId: string, alias: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  saveSubscription: (ipoId: string, accountId: string, patch: Partial<Subscription>) => Promise<void>;
  setBudget: (n: number) => Promise<void>;
  addMemberEmail: (email: string) => Promise<void>;
  removeMemberEmail: (email: string) => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

const lower = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [householdLoaded, setHouseholdLoaded] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [ipos, setIpos] = useState<Ipo[]>([]);
  const [accounts, setAccounts] = useState<OwnedAccount[]>([]);
  const [subscriptions, setSubscriptions] = useState<OwnedSubscription[]>([]);

  const uid = user?.uid ?? null;
  const email = lower(user?.email);

  // 1) 내 이메일이 허용 목록에 있는 가족 그룹 찾기
  useEffect(() => {
    setHousehold(null);
    setHouseholdLoaded(false);
    if (!uid || !email) return;
    const q = query(collection(db, 'households'), where('memberEmails', 'array-contains', email));
    return onSnapshot(
      q,
      (snap) => {
        const d = snap.docs[0];
        setHousehold(d ? ({ id: d.id, ...(d.data() as Omit<Household, 'id'>) }) : null);
        setHouseholdLoaded(true);
      },
      () => setHouseholdLoaded(true),
    );
  }, [uid, email]);

  // 2) 그룹 하위 컬렉션 구독
  const hid = household?.id;
  useEffect(() => {
    setMembers([]); setMembersLoaded(false); setBrokers([]); setIpos([]); setAccounts([]); setSubscriptions([]);
    if (!hid) return;
    const base = (name: string) => collection(db, 'households', hid, name);
    const unsubs: Unsubscribe[] = [
      onSnapshot(base('members'), (s) => { setMembers(s.docs.map((d) => d.data() as Member)); setMembersLoaded(true); }),
      onSnapshot(base('brokers'), (s) => setBrokers(s.docs.map((d) => d.data() as Broker))),
      onSnapshot(base('ipos'), (s) =>
        setIpos(s.docs.map((d) => {
          const x = d.data() as DocumentData;
          return { id: d.id, collected: x.collected ?? {}, manual: x.manual ?? {}, dartRceptNo: x.dartRceptNo, updatedBy: x.updatedBy, updatedAt: x.updatedAt?.toMillis?.() ?? x.updatedAt } as Ipo;
        })),
      ),
      onSnapshot(base('accounts'), (s) => setAccounts(s.docs.map((d) => ({ ...(d.data() as OwnedAccount), id: d.id })))),
      onSnapshot(base('subscriptions'), (s) => setSubscriptions(s.docs.map((d) => ({ ...(d.data() as OwnedSubscription), id: d.id })))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [hid]);

  const me = useMemo(() => members.find((m) => m.uid === uid) ?? null, [members, uid]);

  // 3) 처음 합류한 구성원은 본인 프로필 문서 생성 (기존 프로필을 덮어쓰지 않도록 로딩 완료 후에만)
  useEffect(() => {
    if (!hid || !uid || !user || !membersLoaded) return;
    if (members.some((m) => m.uid === uid)) return;
    const profile: Member = { uid, email, name: user.displayName ?? email, budget: DEFAULT_BUDGET };
    void setDoc(doc(db, 'households', hid, 'members', uid), profile);
  }, [hid, uid, user, email, members, membersLoaded]);

  const requireHid = () => {
    if (!hid || !uid) throw new Error('가족 그룹이 없어요.');
    return { hid, uid };
  };

  const createHousehold = useCallback(async (name: string) => {
    if (!uid || !email) throw new Error('로그인이 필요해요.');
    const ref = doc(collection(db, 'households'));
    await setDoc(ref, { name, adminUid: uid, memberEmails: [email], createdAt: serverTimestamp() });
    const batch = writeBatch(db);
    for (const { match: _m, ...b } of BROKER_SEEDS) batch.set(doc(db, 'households', ref.id, 'brokers', b.id), b);
    batch.set(doc(db, 'households', ref.id, 'members', uid), {
      uid, email, name: user?.displayName ?? email, budget: DEFAULT_BUDGET,
    } satisfies Member);
    await batch.commit();
  }, [uid, email, user]);

  const value: DataState = {
    ready: !uid ? true : householdLoaded && (!hid || !!me),
    needsHousehold: !!uid && householdLoaded && !hid,
    household, me, members, brokers, ipos, accounts, subscriptions,
    isAdmin: !!household && household.adminUid === uid,
    createHousehold,
    async saveIpo(id, manual) {
      const { hid, uid } = requireHid();
      const ref = id ? doc(db, 'households', hid, 'ipos', id) : doc(collection(db, 'households', hid, 'ipos'));
      const existing = id ? ipos.find((i) => i.id === id) : undefined;
      await setDoc(
        ref,
        {
          collected: existing?.collected ?? {},
          manual,
          ...(existing?.dartRceptNo ? { dartRceptNo: existing.dartRceptNo } : {}),
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        },
      );
      return ref.id;
    },
    async deleteIpo(id) {
      const { hid } = requireHid();
      await deleteDoc(doc(db, 'households', hid, 'ipos', id));
    },
    async saveBroker(b) {
      const { hid } = requireHid();
      await setDoc(doc(db, 'households', hid, 'brokers', b.id), b);
    },
    async addAccount(brokerId, alias) {
      const { hid, uid } = requireHid();
      const ref = doc(collection(db, 'households', hid, 'accounts'));
      await setDoc(ref, { brokerId, alias, ownerUid: uid });
    },
    async deleteAccount(id) {
      const { hid } = requireHid();
      await deleteDoc(doc(db, 'households', hid, 'accounts', id));
    },
    async saveSubscription(ipoId, accountId, patch) {
      const { hid, uid } = requireHid();
      const id = `${ipoId}_${accountId}`;
      const cur = subscriptions.find((s) => s.id === id);
      const { ownerUid: _o, ...rest } = cur ?? { ...emptySubscription(ipoId, accountId), ownerUid: uid };
      await setDoc(doc(db, 'households', hid, 'subscriptions', id), { ...rest, ...patch, id, ownerUid: uid });
    },
    async setBudget(n) {
      const { hid, uid } = requireHid();
      await updateDoc(doc(db, 'households', hid, 'members', uid), { budget: n });
    },
    async addMemberEmail(e) {
      const { hid } = requireHid();
      await updateDoc(doc(db, 'households', hid), { memberEmails: arrayUnion(lower(e)) });
    },
    async removeMemberEmail(e) {
      const { hid } = requireHid();
      await updateDoc(doc(db, 'households', hid), { memberEmails: arrayRemove(lower(e)) });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error('DataProvider 밖에서 useData를 호출했어요.');
  return v;
}

/** 내 계좌·청약 기록만 */
export function useMine() {
  const { accounts, subscriptions, me } = useData();
  const uid = me?.uid;
  return useMemo(() => ({
    accounts: accounts.filter((a) => a.ownerUid === uid),
    subscriptions: subscriptions.filter((s) => s.ownerUid === uid),
    budget: me?.budget ?? DEFAULT_BUDGET,
  }), [accounts, subscriptions, uid, me]);
}

