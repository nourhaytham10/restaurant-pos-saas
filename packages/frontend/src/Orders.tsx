import React, { useEffect, useState } from 'react';
import { api } from './api';

const STATUS: any = {
  PENDING: 'قيد الانتظار', ACCEPTED: 'مقبول', PREPARING: 'قيد التحضير', READY: 'جاهز',
  OUT_FOR_DELIVERY: 'خرج للتوصيل', DELIVERED: 'تم التسليم', REJECTED: 'مرفوض', CANCELLED: 'ملغي',
};
const TYPES: any = { DINE_IN: 'صالة', TAKEAWAY: 'تيك أواي', DELIVERY: 'دليفري', PRE_ORDER: 'حجز', OWNER: 'أونر', STAFF: 'عاملين' };

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [fStatus, setFStatus] = useState('');
  const [fNum, setFNum] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fBranch, setFBranch] = useState(() => { try { return localStorage.getItem('lastBranch') || ''; } catch { return ''; } });
  const [loading, setLoading] = useState(true);

  const load = () => api('/orders').then((d: any) => setOrders(Array.isArray(d) ? d : (d.data || d.items || []))).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => {
    load();
    api('/branches').then((b: any) => setBranches(Array.isArray(b) ? b : (b.data || []))).catch(() => {});
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = () => { try { setFBranch(localStorage.getItem('lastBranch') || ''); } catch {} };
    window.addEventListener('lastbranch', h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener('lastbranch', h); window.removeEventListener('storage', h); };
  }, []);

  const setStatus = async (id: string, status: string) => {
    try { await api('/orders/' + id + '/status', { method: 'PATCH', body: { status } }); load(); }
    catch (e: any) { alert(e.message || 'فشل تحديث الحالة'); }
  };

  const rows = orders.filter((o: any) => {
    if (fStatus && o.status !== fStatus) return false;
    if (fBranch && String(o.branchId || '') !== String(fBranch)) return false;
    if (fNum && String(o.dailyNumber ?? o.number ?? '') !== fNum.trim()) return false;
    if (fPhone && !String(o.customerPhone || o.phone || '').includes(fPhone.trim())) return false;
    return true;
  });

  const th: React.CSSProperties = { padding: '10px 8px', fontSize: 12, color: '#0f172a', background: '#e5e9ef', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 };
  const td: React.CSSProperties = { padding: '9px 8px', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', textAlign: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#e5e9ef', padding: 8, borderRadius: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="inp" style={{ maxWidth: 160 }} placeholder="بحث برقم الطلب" value={fNum} onChange={(e) => setFNum(e.target.value)} />
        <input className="inp" style={{ maxWidth: 160 }} placeholder="بحث برقم العميل" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS).map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={fBranch} onChange={(e) => { setFBranch(e.target.value); try { localStorage.setItem('lastBranch', e.target.value); window.dispatchEvent(new Event('lastbranch')); } catch {} }} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="">كل الفروع</option>
          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="cat-btn" onClick={load}>↻ تحديث</button>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead><tr>
            <th style={th}>#</th><th style={th}>رقم</th><th style={th}>الحالة</th><th style={th}>نوع الطلب</th>
            <th style={th}>العميل</th><th style={th}>الهاتف</th><th style={th}>الإجمالي</th><th style={th}>الوقت</th><th style={th}>تغيير الحالة</th>
          </tr></thead>
          <tbody>
            {rows.map((o: any, i: number) => (
              <tr key={o.id}>
                <td style={td}>{i + 1}</td>
                <td style={td}><b>{o.dailyNumber ?? o.number ?? '-'}</b></td>
                <td style={td}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: o.status === 'DELIVERED' ? '#dcfce7' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? '#fee2e2' : o.status === 'PENDING' ? '#fef3c7' : '#e0e7ff', color: o.status === 'DELIVERED' ? '#16a34a' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? '#dc2626' : o.status === 'PENDING' ? '#b45309' : '#4338ca' }}>
                    {STATUS[o.status] || o.status}
                  </span>
                </td>
                <td style={td}>{TYPES[o.type || o.orderType] || o.type || o.orderType}</td>
                <td style={td}>{o.customerName || o.customer?.name || '-'}</td>
                <td style={td}>{o.customerPhone || o.phone || '-'}</td>
                <td style={td}><b>{o.total}</b></td>
                <td style={td}>{new Date(o.createdAt).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}</td>
                <td style={td}>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                    {Object.entries(STATUS).map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} style={{ ...td, color: '#94a3b8', padding: 30 }}>{loading ? 'جاري التحميل...' : 'لا توجد طلبات'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
