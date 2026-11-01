import React, { useEffect, useState } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { api } from './api';
import { Empty, money, when } from './main';

type Tab = 'flags' | 'materials' | 'reconciliation';

const TAB_LABEL: Record<Tab, string> = { flags: 'Flags', materials: 'Materials', reconciliation: 'Reconciliation' };

type MaterialItem = {
  id: string; name: string; unit: string; stockQuantity: number; lowStockThreshold: number; lowStock: boolean;
  createdAt: string; updatedAt: string;
};

type CustomPricedItem = {
  orderId: string; orderNumber: string; customerName: string; name: string;
  quantity: number; unitPricePesewas: number; totalPesewas: number; createdAt: string;
};
type LateCancellation = {
  orderId: string; orderNumber: string; customerName: string;
  cancelledOrRefundedAt: string; reachedStage: string; reachedAt: string;
};
type UnattendedJob = { jobId: string; jobNumber: string; orderNumber: string; occurredAt: string; note: string };

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function FlagsTab() {
  const [range, setRange] = useState({ from: daysAgo(7), to: today() });
  const [date, setDate] = useState(today());
  const [customPriced, setCustomPriced] = useState<CustomPricedItem[]>([]);
  const [lateCancellations, setLateCancellations] = useState<LateCancellation[]>([]);
  const [unattended, setUnattended] = useState<UnattendedJob[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [cp, lc, uj] = await Promise.all([
        api.flagCustomPriced<CustomPricedItem[]>(range),
        api.flagLateCancellations<LateCancellation[]>(range),
        api.flagUnattendedJobs<UnattendedJob[]>(date),
      ]);
      setCustomPriced(cp); setLateCancellations(lc); setUnattended(uj); setError('');
    } catch (e) { setError(errText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {error && <div className="alert" role="alert">{error}</div>}

      <section className="surface" style={{ marginBottom: 16 }}>
        <div className="section-title">
          <div><h2>Custom-priced items</h2><p>Every manual-quote line item — the only place a human types in a price — for the owner to review</p></div>
        </div>
        <div className="form-grid three" style={{ marginBottom: 12 }}>
          <label>From<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>To<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button className="button ghost" disabled={loading} onClick={load} style={{ alignSelf: 'end' }}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {customPriced.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Qty</th><th>Price</th><th>Date</th></tr></thead>
            <tbody>{customPriced.map((i) => (
              <tr key={i.orderId + i.name}>
                <td><strong>{i.orderNumber}</strong></td><td>{i.customerName}</td><td>{i.name}</td>
                <td>{i.quantity}</td><td>{money(i.totalPesewas)}</td><td>{when(i.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted" style={{ padding: 20 }}>No custom-priced items in this range.</p>}
      </section>

      <section className="surface" style={{ marginBottom: 16 }}>
        <div className="section-title">
          <div><h2>Late cancellations and refunds</h2><p>Orders cancelled or refunded after they had already reached production — an ordinary cancellation almost never happens this late</p></div>
        </div>
        {lateCancellations.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Order</th><th>Customer</th><th>Reached</th><th>Cancelled/refunded</th></tr></thead>
            <tbody>{lateCancellations.map((c) => (
              <tr key={c.orderId}>
                <td><strong>{c.orderNumber}</strong></td><td>{c.customerName}</td>
                <td>{c.reachedStage.replaceAll('_', ' ')} · {when(c.reachedAt)}</td>
                <td>{when(c.cancelledOrRefundedAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted" style={{ padding: 20 }}>No late cancellations or refunds in this range.</p>}
      </section>

      <section className="surface">
        <div className="section-title">
          <div><h2>Unattended production jobs</h2><p>Production stage changes with nobody clocked in to have done the work — a report, not a block</p></div>
        </div>
        <div className="form-grid three" style={{ marginBottom: 12 }}>
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <button className="button ghost" disabled={loading} onClick={load} style={{ alignSelf: 'end' }}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {unattended.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Job</th><th>Order</th><th>When</th><th>Note</th></tr></thead>
            <tbody>{unattended.map((j) => (
              <tr key={j.jobId + j.occurredAt}>
                <td><strong>{j.jobNumber}</strong></td><td>{j.orderNumber}</td><td>{when(j.occurredAt)}</td><td>{j.note || '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted" style={{ padding: 20 }}>No unattended stage changes on this date.</p>}
      </section>
    </div>
  );
}

function MaterialsTab() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', stockQuantity: '', lowStockThreshold: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try { setMaterials(await api.materials<MaterialItem[]>()); setError(''); }
    catch (e) { setError(errText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createMaterial({
        name: form.name,
        unit: form.unit,
        stockQuantity: Number(form.stockQuantity) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
      });
      setForm({ name: '', unit: '', stockQuantity: '', lowStockThreshold: '' });
      setAdding(false);
      await load();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  async function adjust(material: MaterialItem) {
    const raw = prompt(`New stock quantity for ${material.name} (${material.unit})`, String(material.stockQuantity));
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) { setError('Enter a quantity of zero or more'); return; }
    const reason = prompt('Reason for adjustment', 'Physical count');
    if (!reason) return;
    try { await api.adjustMaterialStock(material.id, { stockQuantity: value, reason }); await load(); }
    catch (e) { setError(errText(e)); }
  }

  if (loading) return <p role="status">Loading materials…</p>;

  return (
    <section className="surface">
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="section-title">
        <div><h2>Material stock</h2><p>Raw consumables — vinyl, ink, paper — tracked separately from shop products</p></div>
        <button className="button primary" onClick={() => setAdding(!adding)}><Plus />{adding ? 'Close' : 'Add material'}</button>
      </div>
      {adding && (
        <form className="form-grid three" onSubmit={addMaterial} style={{ marginBottom: 16 }}>
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Unit<input required placeholder="e.g. sq ft, roll, litre" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
          <label>Starting stock<input required type="number" min="0" step="0.01" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} /></label>
          <label>Low-stock threshold<input required type="number" min="0" step="0.01" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></label>
          <button className="button primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save material'}</button>
        </form>
      )}
      {materials.length ? (
        <div className="data-table">
          <table>
            <thead><tr><th>Name</th><th>Unit</th><th>Stock</th><th /></tr></thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.unit}</td>
                  <td><strong>{m.stockQuantity}</strong>{m.lowStock && <small style={{ color: 'var(--color-red)', display: 'block' }}>Low stock</small>}</td>
                  <td><button className="button ghost" onClick={() => adjust(m)}>Adjust</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={<ShieldAlert />} title="No materials yet" copy="Add the shop's consumables to start tracking stock against production jobs." />
      )}
    </section>
  );
}

type BilledLine = { serviceCode: string; serviceName: string; totalAreaSqFt: number };
type LoggedLine = { materialName: string; totalQuantity: number; unit: string };

function ReconciliationTab() {
  const [range, setRange] = useState({ from: daysAgo(30), to: today() });
  const [billed, setBilled] = useState<BilledLine[]>([]);
  const [logged, setLogged] = useState<LoggedLine[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await api.materialReconciliation<{ billedByServiceCode: BilledLine[]; loggedByMaterial: LoggedLine[] }>(range.from, range.to);
      setBilled(result.billedByServiceCode); setLogged(result.loggedByMaterial); setError('');
    } catch (e) { setError(errText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {error && <div className="alert" role="alert">{error}</div>}
      <section className="surface" style={{ marginBottom: 16 }}>
        <div className="form-grid three">
          <label>From<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>To<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button className="button ghost" disabled={loading} onClick={load} style={{ alignSelf: 'end' }}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>Two independent numbers to compare, not an automatic match — nothing here links a material to a service code, so a gap between them is for a person to judge, not a computed variance.</p>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="surface">
          <div className="section-title"><div><h2>Billed by service code</h2><p>Area invoiced on released large-format jobs</p></div></div>
          {billed.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Service</th><th>Sq ft</th></tr></thead>
              <tbody>{billed.map((b) => <tr key={b.serviceCode}><td><strong>{b.serviceName}</strong></td><td>{b.totalAreaSqFt}</td></tr>)}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No billed area in this range.</p>}
        </section>
        <section className="surface">
          <div className="section-title"><div><h2>Logged by material</h2><p>Consumption staff recorded against jobs</p></div></div>
          {logged.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Material</th><th>Quantity</th></tr></thead>
              <tbody>{logged.map((l) => <tr key={l.materialName}><td><strong>{l.materialName}</strong></td><td>{l.totalQuantity} {l.unit}</td></tr>)}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No consumption logged in this range.</p>}
        </section>
      </div>
    </div>
  );
}

/**
 * Owner-only review surface: payment-override log, material stock and
 * per-job consumption, and the material/billed-area reconciliation report.
 */
export default function Controls() {
  const [tab, setTab] = useState<Tab>('flags');

  return (
    <div className="view-enter">
      <div className="tab-row" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['flags', 'materials', 'reconciliation'] as const).map((t) => (
          <button key={t} className={tab === t ? 'button primary' : 'button ghost'} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'flags' && <FlagsTab />}

      {tab === 'materials' && <MaterialsTab />}

      {tab === 'reconciliation' && <ReconciliationTab />}
    </div>
  );
}
