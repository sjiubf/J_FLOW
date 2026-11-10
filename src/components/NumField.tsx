import React, { useEffect, useState } from 'react';
import { Field } from './ui';
import { parseNum } from '../lib/format';

/** 숫자 입력. 입력 중에는 로컬 상태만 바꾸고, 포커스를 잃을 때 저장한다. */
export function NumField({ label, value, onCommit, placeholder }: {
  label: string; value: number | null; onCommit: (n: number | null) => void; placeholder?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => setText(value == null ? '' : String(value)), [value]);
  return (
    <Field
      label={label}
      value={text}
      placeholder={placeholder}
      keyboardType="numeric"
      onChangeText={setText}
      onBlur={() => {
        const n = parseNum(text);
        if (n !== value) onCommit(n);
      }}
    />
  );
}
