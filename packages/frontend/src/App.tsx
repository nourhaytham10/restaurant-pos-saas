import React, { useEffect, useState } from 'react';
import { api, getToken, setToken, login } from './api';
import Pos from './Pos';
import Orders from './Orders';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState('pos');
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');

  useEffect(() => {
    if (getToken()) api('/branches').then(() => setAuthed(true)).catch(() => setToken('')).finally(() => setChecking(false));
    else setChecking(false);
  }, []);

  const doLogin = async () => {
    setErr('');
    try { await login(u, p); setAuthed(true); } catch (e: any) { setErr(e.message || 'فشل تسجيل الدخول'); }
  };

  if (checking) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, textAlign: 'center' }}>تسجيل الدخول</h2>
        <input className="inp" placeholder="اسم المستخدم" value={u} onChange={(e) => setU(e.target.value)} />
        <input className="inp" type="password" placeholder="كلمة المرور" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
        {err && <div style={{ color: '#dc2626', fontSize: 13 }}>{err}</div>}
        <button className="btn-primary" onClick={doLogin}>دخول</button>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>تجريبي: cashier_demo / Cashier@1234</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: 64, background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 8 }}>
        <button className={'cat-btn' + (page === 'pos' ? ' on' : '')} style={{ writingMode: 'vertical-rl', padding: '14px 8px' }} onClick={() => setPage('pos')}>بيع</button>
        <button className={'cat-btn' + (page === 'orders' ? ' on' : '')} style={{ writingMode: 'vertical-rl', padding: '14px 8px' }} onClick={() => setPage('orders')}>طلبات</button>
        <div style={{ flex: 1 }} />
        <button className="cat-btn" style={{ padding: 8 }} onClick={() => { setToken(''); setAuthed(false); }}>خروج</button>
      </div>
      <div style={{ flex: 1, padding: 12, overflowX: 'hidden' }}>
        {page === 'pos' ? <Pos /> : <Orders />}
      </div>
    </div>
  );
}
