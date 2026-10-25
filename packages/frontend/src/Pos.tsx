import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const ORDER_TYPES = [
  { v: 'DINE_IN', l: 'صالة' }, { v: 'TAKEAWAY', l: 'تيك أواي' },
  { v: 'DELIVERY', l: 'دليفري' }, { v: 'PRE_ORDER', l: 'حجز' },
  { v: 'OWNER', l: 'أونر' }, { v: 'STAFF', l: 'عاملين' },
];

export default function Pos() {
  const [menu, setMenu] = useState<any>({ categories: [], products: [] });
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [catId, setCatId] = useState<string>('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [lines, setLines] = useState<any[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);
  const [custName, setCustName] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discType, setDiscType] = useState<'amount' | 'percent'>('amount');
  const [pay, setPay] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api('/menu'), api('/branches')])
      .then(([m, b]) => {
        const arr = Array.isArray(b) ? b : (b as any).data || [];
        setMenu(m || { categories: [], products: [] });
        setBranches(arr);
        const saved = localStorage.getItem('lastBranch') || '';
        const chosen = saved && arr.some((x: any) => String(x.id) === saved) ? saved : (arr[0]?.id ? String(arr[0].id) : '');
        setBranchId(chosen);
        setCatId(m?.categories?.[0]?.id ? String(m.categories[0].id) : '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = () => { try { setBranchId(localStorage.getItem('lastBranch') || ''); } catch {} };
    window.addEventListener('lastbranch', h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener('lastbranch', h); window.removeEventListener('storage', h); };
  }, []);

  const changeOrderType = (v: string) => {
    setOrderType(v);
    if (v === 'DINE_IN' || v === 'TAKEAWAY') {
      setDeliveryFee(0); setPhone(''); setCustName(''); setAddr('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (menu.products || []).filter((p: any) => {
      const inCat = !catId || String(p.categoryId) === String(catId);
      const inSearch = !q || (p.name || '').toLowerCase().includes(q);
      const inBranch = !branchId || !p.branchId || String(p.branchId) === String(branchId);
      return inCat && inSearch && inBranch;
    });
  }, [menu, catId, search, branchId]);

  const addLine = (p: any, size?: any) => {
    const key = p.id + '-' + (size?.id || '');
    setLines(prev => {
      const ex = prev.find((l: any) => l.key === key);
      if (ex) return prev.map(l => l.key === key ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { key, productId: p.id, sizeId: size?.id || null, name: p.name, sizeName: size?.name || '', price: Number(size?.price ?? p.basePrice ?? 0), quantity: 1 }];
    });
  };

  const setQty = (i: number, q: number) => {
    if (q < 1) return removeLine(i);
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, quantity: q } : l));
  };

  const removeLine = (i: number) => {
    setRemoving(i);
    setTimeout(() => { setLines(prev => prev.filter((_, idx) => idx !== i)); setRemoving(null); }, 260);
  };

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discValue = discType === 'percent' ? (subtotal * (discount || 0)) / 100 : (discount || 0);
  const dFee = orderType === 'DELIVERY' ? Number(deliveryFee || 0) : 0;
  const total = Math.max(0, subtotal - discValue + dFee);

  const submit = async () => {
    if (lines.length === 0) return alert('السلة فارغة');
    setSubmitting(true);
    try {
      const items = lines.map(l => ({ productId: Number(l.productId), sizeId: l.sizeId ? Number(l.sizeId) : null, quantity: l.quantity, notes: '' }));
      const body = {
        type: orderType, items,
        customerName: custName || null, customerPhone: phone || null, deliveryAddress: addr || null,
        deliveryFee: dFee, discount: discValue, discountType: discType, total,
        paymentMethod: pay, notes: notes || null, branchId: branchId ? Number(branchId) : null,
      };
      const r = await api('/orders', { method: 'POST', body });
      setSuccessMsg('تم تسجيل الطلب رقم ' + (r.id || r.number || '') + ' بنجاح');
      setLines([]); setCustName(''); setPhone(''); setAddr(''); setNotes(''); setDiscount(0);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) { alert(e.message || 'فشل حفظ الطلب'); }
    setSubmitting(false);
  };

  const th: React.CSSProperties = { padding: '10px 8px', fontSize: 13, color: '#0f172a', background: '#e5e9ef', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 };
  const td: React.CSSProperties = { padding: '10px 8px', fontSize: 14, background: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 12, height: 'calc(100vh - 24px)' }}>
      {/* LEFT: menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {/* order types */}
        <div style={{ background: '#e5e9ef', padding: 8, borderRadius: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ORDER_TYPES.map(t => (
              <button key={t.v} className={'cat-btn' + (orderType === t.v ? ' on' : '')} onClick={() => changeOrderType(t.v)}>{t.l}</button>
            ))}
          </div>
        </div>
        {/* branch + search */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={branchId} onChange={(e) => { setBranchId(e.target.value); try { localStorage.setItem('lastBranch', e.target.value); window.dispatchEvent(new Event('lastbranch')); } catch {} }} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="">كل الفروع</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className="inp" placeholder="بحث عن صنف..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {/* categories */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0' }}>
          {(menu.categories || []).map(c => (
            <button key={c.id} className={'cat-btn' + (String(c.id) === String(catId) ? ' on' : '')} onClick={() => setCatId(String(c.id))}>{c.name}</button>
          ))}
        </div>
        {/* size headers + grid */}
        {filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '0 10px' }}>
              <span style={{ flex: 1 }} />
              {['صغير', 'وسط', 'كبير'].map(nm => <span key={nm} style={{ width: 42, textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: 700 }}>{nm}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '0 10px' }}>
              <span style={{ flex: 1 }} />
              {['صغير', 'وسط', 'كبير'].map(nm => <span key={nm} style={{ width: 42, textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: 700 }}>{nm}</span>)}
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {filtered.map((p: any) => (
              <div key={p.id} style={{ background: '#eef2f6', border: '1px solid #d7dce3', borderRadius: 12, padding: '6px 10px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{p.name}</div>
                {p.sizes && p.sizes.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ flex: 1 }} />
                    {p.sizes.map((s: any) => (
                      <button key={s.id} onClick={() => addLine(p, s)} style={{ width: 42, height: 42, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                        <span style={{ fontSize: 10 }}>{s.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{s.price}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => addLine(p)} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    {p.basePrice || 0} - إضافة
                  </button>
                )}
              </div>
            ))}
          </div>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>لا توجد أصناف</div>}
        </div>
      </div>

      {/* RIGHT: cart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 8px' }}>🛒 السلة</h3>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>الصنف</th><th style={th}>السعر</th><th style={th}>الكمية</th><th style={th}>الإجمالي</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.key} className={removing === i ? 'row-out' : ''} style={td}>
                    <td style={td}>{l.name}{l.sizeName && <div style={{ fontSize: 11, color: '#64748b' }}>{l.sizeName}</div>}</td>
                    <td style={td}>{l.price}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => setQty(i, l.quantity - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #111', background: '#fff', color: '#111', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                        <b>{l.quantity}</b>
                        <button onClick={() => setQty(i, l.quantity + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #111', background: '#fff', color: '#111', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                      </span>
                    </td>
                    <td style={td}>{l.price * l.quantity}</td>
                    <td style={td}><button onClick={() => removeLine(i)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>حذف</button></td>
                  </tr>
                ))}
                {lines.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#94a3b8', padding: 30 }}>السلة فارغة</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* customer + delivery */}
        {(orderType === 'DELIVERY' || orderType === 'PRE_ORDER') && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="inp" placeholder="اسم العميل" value={custName} onChange={(e) => setCustName(e.target.value)} />
            <input className="inp" placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {orderType === 'DELIVERY' && <>
              <input className="inp" placeholder="العنوان" value={addr} onChange={(e) => setAddr(e.target.value)} />
              <div className="line"><label style={{ fontSize: 12 }}>رسوم التوصيل</label><input type="number" className="inp" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} /></div>
            </>}
          </div>
        )}

        {/* discount + pay */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" className="inp" placeholder="خصم" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} />
            <select value={discType} onChange={(e) => setDiscType(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <option value="amount">مبلغ</option>
              <option value="percent">%</option>
            </select>
          </div>
          <select value={pay} onChange={(e) => setPay(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
            <option value="CASH">كاش</option>
            <option value="CARD">فيزا</option>
            <option value="WALLET">محفظة</option>
          </select>
          <textarea className="inp" placeholder="ملاحظات..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {/* totals */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 12px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>المجموع</span><b>{subtotal}</b>
          </div>
          {discValue > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}><span>الخصم</span><b>-{discValue}</b></div>}
          {dFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}><span style={{ width: '100%', textAlign: 'center' }}>التوصيل</span><b>{dFee}</b></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', marginTop: 6, paddingTop: 6, fontSize: 18 }}>
            <b>الإجمالي</b><b style={{ color: '#111' }}>{total}</b>
          </div>
        </div>

        <button className="btn-primary" onClick={submit} disabled={submitting || lines.length === 0}>
          {submitting ? 'جاري الحفظ...' : '✓ تأكيد الطلب'}
        </button>
      </div>

      {successMsg && (
        <div className="success-overlay">
          <div className="success-box">
            <svg viewBox="0 0 52 52" className="success-svg">
              <circle className="success-circle" cx="26" cy="26" r="24" fill="none" />
              <path className="success-check" fill="none" d="M14 27l8 8 16-16" />
            </svg>
            <div className="success-text">{successMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
