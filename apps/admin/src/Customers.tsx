import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, UserPlus, Users, X } from 'lucide-react';
import { api, isQueued } from './api';
import { updateCustomer } from './versionedActions';
import { listCommands, subjectSyncStatus } from './offline/queue';
import type { QueuedCommand } from './offline/queue';
import { SyncStatusBadge } from './offline/SyncStatusBadge';

type Customer = {
  id: string; email: string; name: string; company: string; phones: string[];
  orderCount: number; lifetimeValuePesewas: number; averageOrderPesewas: number;
  firstOrderAt: string | null; lastOrderAt: string | null; version?: number;
};
type CustomerDetail = Customer & {
  orders: { id: string; orderNumber: string; source: string; status: string; paymentStatus: string; totalPesewas: number; refundedPesewas: number; createdAt: string }[];
};

const money = (p: number) => 'GH₵ ' + (p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (v: string | null) => (v ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' }).format(new Date(v)) : '—');

type AuditEntry = { id: string; action: string; actorEmail: string; createdAt: string; details: { before?: Record<string, string>; after?: Record<string, string>; [key: string]: unknown } };
const FIELD_LABEL: Record<string, string> = { name: 'Name', email: 'Email', phone: 'Phone', company: 'Company' };
const stamp = (v: string) => new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

type CustomerForm = { name: string; email: string; phone: string; company: string };

function CustomerModal({ customer, onClose, onSave }: { customer?: Customer; onClose: () => void; onSave: (data: CustomerForm) => Promise<void> }) {
  const [form, setForm] = useState<CustomerForm>({ name: customer?.name || '', email: customer?.email || '', phone: customer?.phones[0] || '', company: customer?.company || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof CustomerForm, value: string) => setForm({ ...form, [key]: value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save customer'); setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="product-modal" onSubmit={submit}>
        <header><div><span>CUSTOMERS</span><h2>{customer ? 'Edit customer' : 'Add customer'}</h2></div><button type="button" onClick={onClose} aria-label="Close editor"><X /></button></header>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="modal-fields">
          <label>Name<input value={form.name} onChange={e => set('name', e.target.value)} required minLength={2} maxLength={120} autoFocus /></label>
          <div className="form-grid">
            <label>Email · optional<input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></label>
            <label>Phone · optional<input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></label>
          </div>
          <label>Company · optional<input value={form.company} onChange={e => set('company', e.target.value)} maxLength={120} /></label>
        </div>
        <footer><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></footer>
      </form>
    </div>
  );
}

const payload = (f: CustomerForm) => ({ name: f.name.trim(), email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, company: f.company.trim() });

/**
 * Checkout stays guest-only; these profiles are derived from the orders
 * themselves, keyed on email, so repeat buyers are visible without anyone
 * having to create an account.
 */
export default function Customers({ notify }: { notify?: (text: string) => void }) {
  const [rows, setRows] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [commands, setCommands] = useState<QueuedCommand[]>([]);

  async function open(id: string) {
    const [detail, entries] = await Promise.all([api.customer<CustomerDetail>(id), api.activity<AuditEntry[]>('customer', id).catch(() => [])]);
    setSelected(detail); setHistory(entries);
  }
  const [error, setError] = useState('');

  async function load(q = search) {
    setLoading(true); setError('');
    try { setRows(await api.customers<Customer[]>(q)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load customers'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(''); }, []);
  useEffect(() => { listCommands().then(setCommands).catch(() => setCommands([])); }, [rows]);

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
            <button type="button" className="button primary" onClick={() => setAdding(true)}><UserPlus />Add customer</button>
          </form>
        </div>

        {rows.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Customer</th><th>Phones</th><th>Orders</th><th>Lifetime value</th><th>Average</th><th>Last order</th><th /></tr></thead>
            <tbody>{rows.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name || '—'}</strong><small>{c.email}{c.company ? ` · ${c.company}` : ''}</small><SyncStatusBadge status={subjectSyncStatus(commands, 'customerId', c.id)} /></td>
                <td>{c.phones.length ? c.phones.join(', ') : <em>none recorded</em>}</td>
                <td className="number">{c.orderCount}{c.orderCount > 1 && <small>repeat</small>}</td>
                <td className="number"><strong>{money(c.lifetimeValuePesewas)}</strong></td>
                <td className="number">{money(c.averageOrderPesewas)}</td>
                <td>{when(c.lastOrderAt)}</td>
                <td><button className="button ghost" onClick={() => open(c.id)}>History</button></td>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <SyncStatusBadge status={subjectSyncStatus(commands, 'customerId', selected.id)} />
              <button className="button ghost" onClick={() => setEditing(true)}>Edit</button>
              <button className="button ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
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
          <h3 style={{ marginTop: 24 }}>History</h3>
          {history.length ? (
            <div className="activity-feed">{history.map(h => (
              <article key={h.id}>
                <div>
                  <strong>{h.action === 'customer_created' ? 'Created' : h.action === 'customer_updated' ? 'Edited' : h.action.replaceAll('_', ' ')}</strong>
                  {h.details.after && Object.keys(h.details.after).map(field => (
                    <p key={field}>{FIELD_LABEL[field] || field}: {h.details.before?.[field] || '(blank)'} → {h.details.after![field] || '(blank)'}</p>
                  ))}
                  <small>{h.actorEmail}</small>
                </div>
                <time>{stamp(h.createdAt)}</time>
              </article>
            ))}</div>
          ) : <p className="muted">No edits recorded for this customer.</p>}
        </section>
      )}

      {adding && <CustomerModal onClose={() => setAdding(false)} onSave={async data => { const created = await api.createCustomer<Customer>(payload(data)); setAdding(false); await load(); if (isQueued(created)) notify?.('Customer saved on this device, will sync when back online'); else await open(created.id); }} />}
      {editing && selected && <CustomerModal customer={selected} onClose={() => setEditing(false)} onSave={async data => { const updated = await updateCustomer(selected, payload(data)); setEditing(false); await load(); if (isQueued(updated)) notify?.('Changes saved on this device, will sync when back online'); else await open(selected.id); }} />}
    </div>
  );
}
