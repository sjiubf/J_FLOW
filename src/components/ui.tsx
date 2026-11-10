import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#F5F7FB', card: '#FFFFFF', text: '#1B2330', sub: '#6B7686', line: '#E2E7EF',
  primary: '#2F6BFF', primarySoft: '#E8EFFF', ok: '#12A150', okSoft: '#E3F6EC', warn: '#C77700', warnSoft: '#FFF2DB', bad: '#D83A3A', badSoft: '#FDE8E8',
};

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const inner = <View style={styles.screenInner}>{children}</View>;
  return scroll
    ? <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView>
    : <View style={styles.screen}>{inner}</View>;
}

/** onPress 가 주어지면(예: Link asChild 가 주입) 눌러서 이동할 수 있는 카드가 된다. */
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return <Pressable onPress={onPress} style={[styles.card, style]}>{children}</Pressable>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export const H1 = ({ children }: { children: React.ReactNode }) => <Text style={styles.h1}>{children}</Text>;
export const H2 = ({ children }: { children: React.ReactNode }) => <Text style={styles.h2}>{children}</Text>;
export const Sub = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <Text style={[styles.sub, color ? { color } : null]}>{children}</Text>
);
export const Body = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
  <Text style={[styles.body, bold ? { fontWeight: '700' } : null]}>{children}</Text>
);

export function Btn({ label, onPress, kind = 'primary', disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean;
}) {
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.badSoft : colors.primarySoft;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.bad : colors.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={{ color: fg, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#9AA5B5" style={styles.input} {...props} />
    </View>
  );
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.chip, value && { backgroundColor: colors.okSoft, borderColor: colors.ok }]}>
      <Text style={{ color: value ? colors.ok : colors.sub, fontWeight: '600' }}>{value ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
      <Text style={{ color: active ? colors.primary : colors.sub, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, style]}>{children}</View>
);

export function Notice({ kind, children }: { kind: 'warn' | 'bad' | 'ok'; children: React.ReactNode }) {
  const bg = kind === 'warn' ? colors.warnSoft : kind === 'bad' ? colors.badSoft : colors.okSoft;
  const fg = kind === 'warn' ? colors.warn : kind === 'bad' ? colors.bad : colors.ok;
  return <View style={{ backgroundColor: bg, padding: 10, borderRadius: 10, marginBottom: 8 }}><Text style={{ color: fg }}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { padding: 16, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 6 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.sub },
  body: { fontSize: 14, color: colors.text },
  btn: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  label: { fontSize: 12, color: colors.sub, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
});
