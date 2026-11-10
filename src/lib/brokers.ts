import type { Broker } from './types';

/**
 * 증권사 시드 목록. 최소 청약 주수·증거금률은 일반적인 기본값(10주, 50%)이고
 * 청약 수수료는 0으로 두었다. 실제 값은 증권사 공지를 보고 설정 화면에서 직접 수정한다.
 * `match`는 DART 공시의 인수인 이름에서 증권사를 찾을 때 쓰는 키워드다.
 */
export interface BrokerSeed extends Broker {
  match: string[];
}

const seed = (id: string, name: string, match: string[] = [name]): BrokerSeed => ({
  id,
  name,
  match,
  minUnits: 10,
  marginRate: 0.5,
  subscribeFee: 0,
});

export const BROKER_SEEDS: BrokerSeed[] = [
  seed('mirae', '미래에셋증권', ['미래에셋']),
  seed('samsung', '삼성증권'),
  seed('nh', 'NH투자증권', ['NH투자', '엔에이치투자']),
  seed('kb', 'KB증권'),
  seed('kis', '한국투자증권', ['한국투자']),
  seed('shinhan', '신한투자증권', ['신한투자']),
  seed('hana', '하나증권'),
  seed('daishin', '대신증권'),
  seed('kiwoom', '키움증권'),
  seed('yuanta', '유안타증권'),
  seed('im', 'iM증권', ['iM증권', '아이엠증권', '하이투자']),
  seed('hanwha', '한화투자증권', ['한화투자']),
  seed('eugene', '유진투자증권', ['유진투자']),
  seed('shinyoung', '신영증권'),
  seed('sangsangin', '상상인증권'),
  seed('sk', 'SK증권'),
  seed('meritz', '메리츠증권'),
  seed('ls', 'LS증권', ['LS증권', '이베스트']),
  seed('db', 'DB금융투자', ['DB금융']),
  seed('hyundaicar', '현대차증권'),
  seed('bookook', '부국증권'),
  seed('ibk', 'IBK투자증권', ['IBK투자']),
  seed('cape', '카카오페이증권', ['카카오페이']),
  seed('toss', '토스증권'),
  seed('koreafoss', '코리아에셋투자증권', ['코리아에셋']),
];

/** DART 인수인 이름 문자열에서 증권사 id 목록 추출 */
export function brokerIdsFromText(text: string): string[] {
  const ids = new Set<string>();
  for (const b of BROKER_SEEDS) if (b.match.some((m) => text.includes(m))) ids.add(b.id);
  return [...ids];
}
