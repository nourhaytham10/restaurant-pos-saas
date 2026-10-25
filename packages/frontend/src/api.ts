export const API = '/api';
export function getToken(){ try { return localStorage.getItem('token') || ''; } catch { return ''; } }
export function setToken(t:string){ try { localStorage.setItem('token', t); } catch {} }
export async function api(path: string, opts: any = {}) {
  const headers: any = { ...(opts.headers || {}) };
  const tok = getToken();
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  if (opts.body && typeof opts.body !== 'string') { opts.body = JSON.stringify(opts.body); headers['Content-Type'] = 'application/json'; }
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { setToken(''); throw new Error('unauthorized'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || ('error ' + res.status));
  return data;
}
export async function login(username: string, password: string) {
  const d = await api('/auth/login', { method: 'POST', body: { username, password } });
  const tok = d.accessToken || d.access_token || (d.tokens && d.tokens.accessToken);
  if (!tok) throw new Error('no token in response');
  setToken(tok);
  return d;
}
