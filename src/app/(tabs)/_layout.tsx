import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { colors } from '../../components/ui';

const icon = (e: string) => () => <Text style={{ fontSize: 18 }}>{e}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: colors.card }, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('✅') }} />
      <Tabs.Screen name="ipos" options={{ title: '종목', tabBarIcon: icon('📈') }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더', tabBarIcon: icon('🗓️') }} />
      <Tabs.Screen name="records" options={{ title: '기록', tabBarIcon: icon('💰') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
