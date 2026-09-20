import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import { api } from './api';

type Customer = {
  id: string; email: string; name: string; company: string; phones: string[];
  orderCount: number; lifetimeValuePesewas: number; averageOrderPesewas: number;
  firstOrderAt: string | null; lastOrderAt: string | null;
};
type CustomerDetail = Customer & {
  orders: { id: string; orderNumber: string; source: string; status: string; paymentStatus: string; totalPesewas: number; refundedPesewas: number; createdAt: string }[];
};

const money = (p: number) => 'GH₵ ' + (p / 100).toFixed(2);
const when = (v: string | null) => (v ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' }).format(new Date(v)) : '—');

/**
 * Checkout stays guest-only; these profiles are derived from the orders
 * themselves, keyed on email, so repeat buyers are visible without anyone
 * having to create an account.
 */
export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(q = search) {
    setLoading(true); setError('');
    try { setRows(await api.customers<Customer[]>(q)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load customers'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(''); }, []);

  if (loading && !rows.length) return <div className="loading"><RefreshCw className="spin" /><strong>Loading customers</strong></div>;

  return (
    <div className="view-enter">
      {error && <div className="alert" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="surface" style={{ marginBottom: 16 }}>
        <div className="section-title">
          <div><h2>Customers</h2><p>Built from guest orders. Repeat buyers are matched on email, and every phone number they have used is kept.</p></div>
          <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); load(); }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email, name or phone" />
            <button className="button ghost"><Search />Search</button>
          </form>
        </div>

        {rows.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Customer</th><th>Phones</th><th>Orders</th><th>Lifetime value</th><th>Average</th><th>Last order</th><th /></tr></thead>
            <tbody>{rows.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name || '—'}</strong><small>{c.email}{c.company ? ` · ${c.company}` : ''}</small></td>
                <td>{c.phones.length ? c.phones.join(', ') : <em>none recorded</em>}</td>
                <td className="number">{c.orderCount}{c.orderCount > 1 && <small>repeat</small>}</td>
                <td className="number"><strong>{money(c.lifetimeValuePesewas)}</strong></td>
                <td className="number">{money(c.averageOrderPesewas)}</td>
                <td>{when(c.lastOrderAt)}</td>
                <td><button className="button ghost" onClick={async () => setSelected(await api.customer<CustomerDetail>(c.id))}>History</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : (
          <div className="empty" style={{ padding: 40, textAlign: 'center' }}>
            <Users /><h3>No customers yet</h3>
            <p className="muted">Profiles appear automatically as orders come in, online or over the counter.</p>
          </div>
        )}
      </section>

      {selected && (
        <section className="surface">
          <div className="section-title">
            <div>
              <h2>{selected.name || selected.email}</h2>
              <p>{selected.email}{selected.phones.length ? ` · ${selected.phones.join(', ')}` : ''} · first order {when(selected.firstOrderAt)}</p>
            </div>
            <button className="button ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="data-table"><table>
            <thead><tr><th>Order</th><th>Date</th><th>Source</th><th>Status</th><th>Payment</th><th>Total</th><th>Refunded</th></tr></thead>
            <tbody>{selected.orders.map(o => (
              <tr key={o.id}>
                <td><strong>{o.orderNumber}</strong></td>
                <td>{when(o.createdAt)}</td>
                <td><span className="category-chip">{o.source.replace('_', ' ')}</span></td>
                <td>{o.status.replaceAll('_', ' ')}</td>
                <td><span className={o.paymentStatus === 'paid' ? 'status active' : 'status draft'}><i />{o.paymentStatus.replace('_', ' ')}</span></td>
                <td className="number">{money(o.totalPesewas)}</td>
                <td className="number">{o.refundedPesewas ? money(o.refundedPesewas) : '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
