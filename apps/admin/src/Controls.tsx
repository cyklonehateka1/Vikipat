import React, { useEffect, useState } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { api } from './api';
import { Empty } from './main';

type Tab = 'flags' | 'materials' | 'reconciliation';

const TAB_LABEL: Record<Tab, string> = { flags: 'Flags', materials: 'Materials', reconciliation: 'Reconciliation' };

type MaterialItem = {
  id: string; name: string; unit: string; stockQuantity: number; lowStockThreshold: number; lowStock: boolean;
  createdAt: string; updatedAt: string;
};

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

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

      {tab === 'flags' && (
        <section className="surface">
          <Empty icon={<ShieldAlert />} title="Nothing here yet" copy="Custom-priced items, late cancellations and refunds, and unattended production jobs will be listed here for review." />
        </section>
      )}

      {tab === 'materials' && <MaterialsTab />}

      {tab === 'reconciliation' && (
        <section className="surface">
          <Empty icon={<ShieldAlert />} title="Nothing here yet" copy="Billed area by service code and logged material consumption will be compared here." />
        </section>
      )}
    </div>
  );
}
