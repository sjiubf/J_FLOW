/** 카카오톡 "나에게 보내기" 호출 (fetch 주입 가능 → 테스트 용이) */
export type Fetch = typeof fetch;

export interface TokenDoc {
  refreshToken: string;
  /** 갱신 시각(ms) — 참고용 */
  updatedAt?: number;
}

export interface RefreshResult {
  accessToken: string;
  /** 카카오는 리프레시 토큰이 만료에 가까울 때만 새 값을 돌려준다 */
  newRefreshToken?: string;
}

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

/** 텍스트 템플릿 본문 최대 길이(200자)에 맞춰 자른다 */
export function truncateForKakao(text: string, max = 200): string {
  const chars = [...text];
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
}

export function buildSendBody(text: string, linkUrl: string): URLSearchParams {
  const template = {
    object_type: 'text',
    text: truncateForKakao(text),
    link: { web_url: linkUrl, mobile_web_url: linkUrl },
    button_title: '앱 열기',
  };
  return new URLSearchParams({ template_object: JSON.stringify(template) });
}

export async function refreshAccessToken(
  f: Fetch, restApiKey: string, refreshToken: string, clientSecret?: string,
): Promise<RefreshResult> {
  const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: restApiKey, refresh_token: refreshToken });
  if (clientSecret) body.set('client_secret', clientSecret);
  const res = await f(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    // 토큰 값은 로그에 남기지 않는다
    throw new Error(`카카오 토큰 갱신 실패: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim());
  }
  return { accessToken: json.access_token, newRefreshToken: json.refresh_token };
}

export async function sendToMe(f: Fetch, accessToken: string, text: string, linkUrl: string): Promise<void> {
  const res = await f(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: buildSendBody(text, linkUrl),
  });
  const json = (await res.json().catch(() => ({}))) as { result_code?: number; msg?: string };
  if (!res.ok || (json.result_code !== undefined && json.result_code !== 0)) {
    throw new Error(`카카오 메시지 전송 실패: ${res.status} ${json.msg ?? ''}`.trim());
  }
}

/** 인가 코드 → 토큰 (최초 연동용) */
export async function exchangeCode(
  f: Fetch, restApiKey: string, redirectUri: string, code: string, clientSecret?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: restApiKey, redirect_uri: redirectUri, code });
  if (clientSecret) body.set('client_secret', clientSecret);
  const res = await f(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(`카카오 인가 코드 교환 실패: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim());
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

export function authorizeUrl(restApiKey: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_id: restApiKey, redirect_uri: redirectUri, response_type: 'code', scope: 'talk_message' });
  return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
}
