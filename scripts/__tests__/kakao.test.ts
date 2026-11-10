import { describe, expect, it, vi } from 'vitest';
import { authorizeUrl, buildSendBody, exchangeCode, refreshAccessToken, sendToMe, truncateForKakao } from '../lib/kakao';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('kakao', () => {
  it('200자 초과 텍스트는 줄임표로 자른다', () => {
    const t = '가'.repeat(250);
    const out = truncateForKakao(t);
    expect([...out]).toHaveLength(200);
    expect(out.endsWith('…')).toBe(true);
    expect(truncateForKakao('짧음')).toBe('짧음');
  });

  it('전송 본문은 template_object JSON', () => {
    const body = buildSendBody('안녕', 'https://app.example');
    const t = JSON.parse(body.get('template_object')!);
    expect(t.object_type).toBe('text');
    expect(t.text).toBe('안녕');
    expect(t.link.web_url).toBe('https://app.example');
  });

  it('토큰 갱신: 새 리프레시 토큰은 있을 때만 반환', async () => {
    const f = vi.fn().mockResolvedValue(json({ access_token: 'AT' }));
    const r = await refreshAccessToken(f as unknown as typeof fetch, 'KEY', 'RT', 'SECRET');
    expect(r).toEqual({ accessToken: 'AT', newRefreshToken: undefined });
    const sent = (f.mock.calls[0][1] as RequestInit).body as URLSearchParams;
    expect(sent.get('grant_type')).toBe('refresh_token');
    expect(sent.get('client_secret')).toBe('SECRET');

    const f2 = vi.fn().mockResolvedValue(json({ access_token: 'AT2', refresh_token: 'RT2' }));
    expect((await refreshAccessToken(f2 as unknown as typeof fetch, 'KEY', 'RT')).newRefreshToken).toBe('RT2');
  });

  it('토큰 갱신 실패 시 오류 메시지에 토큰 값을 넣지 않는다', async () => {
    const f = vi.fn().mockResolvedValue(json({ error: 'invalid_grant', error_description: 'expired' }, 400));
    await expect(refreshAccessToken(f as unknown as typeof fetch, 'KEY', 'SECRET-RT')).rejects.toThrow(/invalid_grant/);
    await refreshAccessToken(f as unknown as typeof fetch, 'KEY', 'SECRET-RT').catch((e: Error) => {
      expect(e.message).not.toContain('SECRET-RT');
    });
  });

  it('전송: Bearer 헤더, 실패 시 예외', async () => {
    const ok = vi.fn().mockResolvedValue(json({ result_code: 0 }));
    await sendToMe(ok as unknown as typeof fetch, 'AT', 'hi', 'https://x');
    expect((ok.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer AT' });

    const bad = vi.fn().mockResolvedValue(json({ msg: 'no permission' }, 403));
    await expect(sendToMe(bad as unknown as typeof fetch, 'AT', 'hi', 'https://x')).rejects.toThrow(/전송 실패/);
  });

  it('인가 코드 교환과 인가 URL', async () => {
    const f = vi.fn().mockResolvedValue(json({ access_token: 'A', refresh_token: 'R' }));
    expect(await exchangeCode(f as unknown as typeof fetch, 'KEY', 'https://r', 'CODE')).toEqual({ accessToken: 'A', refreshToken: 'R' });
    const u = new URL(authorizeUrl('KEY', 'https://r'));
    expect(u.searchParams.get('scope')).toBe('talk_message');
    expect(u.searchParams.get('client_id')).toBe('KEY');
  });
});
