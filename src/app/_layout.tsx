import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { signInWithGoogle } from '../auth/google';
import { Btn, Card, colors, H1, Notice, Screen, Sub, Body, Field } from '../components/ui';
import { DataProvider, useData } from '../data/store';
import { isFirebaseConfigured } from '../firebase/config';
import { useLocalReminders } from '../notifications/localReminders';

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const data = useData();
  const [err, setErr] = React.useState('');
  const [name, setName] = React.useState('우리 가족');

  if (!isFirebaseConfigured) {
    return (
      <Screen>
        <H1>설정이 필요해요</H1>
        <Notice kind="warn">Firebase 설정(.env)이 비어 있어요. docs/SETUP.md 의 1단계를 먼저 진행하세요.</Notice>
      </Screen>
    );
  }
  if (loading || (user && !data.ready && !data.needsHousehold)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!user) {
    return (
      <Screen>
        <H1>공모픽</H1>
        <Sub>가족이 함께 쓰는 공모주 청약 관리</Sub>
        <Card>
          <Body>Google 계정으로 로그인하세요. 관리자가 등록한 가족 이메일만 같은 그룹에 합류할 수 있어요.</Body>
          {err ? <Notice kind="bad">{err}</Notice> : null}
          <Btn label="Google로 로그인" onPress={() => signInWithGoogle().catch((e) => setErr(String(e?.message ?? e)))} />
        </Card>
      </Screen>
    );
  }
  if (data.needsHousehold) {
    return (
      <Screen>
        <H1>가족 그룹</H1>
        <Card>
          <Body>이 이메일({user.email})이 등록된 가족 그룹이 없어요.</Body>
          <Sub>가족 중 관리자가 이미 그룹을 만들었다면, 관리자에게 이 이메일을 등록해 달라고 요청하세요. 처음이라면 아래에서 새 그룹을 만들어 관리자가 됩니다.</Sub>
          <Field label="그룹 이름" value={name} onChangeText={setName} />
          {err ? <Notice kind="bad">{err}</Notice> : null}
          <Btn label="새 가족 그룹 만들기" onPress={() => data.createHousehold(name.trim() || '우리 가족').catch((e) => setErr(String(e?.message ?? e)))} />
        </Card>
      </Screen>
    );
  }
  return <>{children}</>;
}

function Reminders() {
  useLocalReminders();
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <Gate>
          <Reminders />
          <Stack screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ipo/[id]" options={{ title: '종목' }} />
          </Stack>
        </Gate>
      </DataProvider>
    </AuthProvider>
  );
}
