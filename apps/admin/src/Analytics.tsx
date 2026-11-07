import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Lightbulb, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from './api';

type Insight = { id: string; severity: 'critical' | 'warning' | 'opportunity' | 'good'; title: string; detail: string; action: string; view?: string; metric?: string };
type Report = {
  windowDays: number;
  revenue: { netPesewas: number; priorNetPesewas: number; changePercent: number; refundedPesewas: number; averageOrderPesewas: number };
  orders: { total: number; priorTotal: number; changePercent: number; paid: number; awaitingPayment: number; conversionPercent: number };
  customers: { total: number; repeat: number; repeatRatePercent: number; newInWindow: number; averageLifetimePesewas: number };
  production: { openJobs: number; blocked: number; overdue: number; unassigned: number };
  quotes: { open: number; won: number; winRatePercent: number };
  inventory: { outOfStock: number; lowStock: number };
  revenueByDay: { date: string; revenuePesewas: number; orders: number }[];
  topMaterials: { code: string; name: string; revenuePesewas: number; jobs: number; areaSqFt: number }[];
  bySource: { source: string; orders: number; revenuePesewas: number; averagePesewas: number }[];
  topCustomers: { id: string; name: string; email: string; orderCount: number; lifetimeValuePesewas: number }[];
};

type MaterialRow = { id: string; name: string; unit: string; stockQuantity: number; lowStock: boolean };
type LoggedLine = { materialName: string; totalQuantity: number; unit: string };
type FlagCounts = { customPriced: number; lateCancellations: number; unattended: number; shortfalls: number };

const money = (p: number) => 'GH₵ ' + (p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SEVERITY_ICON = { critical: <AlertTriangle />, warning: <AlertTriangle />, opportunity: <Lightbulb />, good: <CheckCircle2 /> };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());

type PresetId = 'today' | 'week' | 'month' | 'year' | 'all';
const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All-time' },
];
// All-time is capped at overview()'s 366-day maximum — labelled "Last 12 months"
// rather than claiming to show everything, since the shop's data may go back further.
function presetRange(id: PresetId): { from: string; to: string } {
  const now = new Date();
  const to = today();
  if (id === 'today') return { from: to, to };
  if (id === 'week') {
    const day = now.getUTCDay();
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
    return { from: iso(monday), to };
  }
  if (id === 'month') return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
  if (id === 'year') return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), to };
  // overview() treats `to` as inclusive (end = to + 1 day) when computing the
  // span, so from = now-365d gives a 366-day span — the server's exact cap.
  return { from: iso(new Date(now.getTime() - 365 * 86400000)), to };
}

/** Bars are drawn relative to the busiest day, so a quiet week still reads. */
function RevenueChart({ data }: { data: Report['revenueByDay'] }) {
  const peak = Math.max(1, ...data.map(d => d.revenuePesewas));
  return (
    <div className="revenue-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, padding: '12px 0' }}>
      {data.map(d => (
        <div key={d.date} title={`${d.date}: ${money(d.revenuePesewas)} · ${d.orders} order(s)`}
          style={{ flex: 1, minWidth: 4, height: `${Math.max(2, (d.revenuePesewas / peak) * 100)}%`, background: d.revenuePesewas ? 'var(--brand-primary, #F38432)' : 'var(--line, #E8E9F2)', borderRadius: '3px 3px 0 0', transition: 'height .3s' }} />
      ))}
    </div>
  );
}

export default function Analytics({ notify, go }: { notify: (t: string) => void; go: (v: string) => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [preset, setPreset] = useState<PresetId>('month');
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [logged, setLogged] = useState<LoggedLine[]>([]);
  const [flags, setFlags] = useState<FlagCounts>({ customPriced: 0, lateCancellations: 0, unattended: 0, shortfalls: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(id = preset) {
    setLoading(true); setError('');
    try {
      const { from, to } = presetRange(id);
      const [r, i, mats, recon, cp, lc, uj, sf] = await Promise.all([
        api.analytics<Report>(30, from, to),
        api.analyticsInsights<Insight[]>(),
        api.materials<MaterialRow[]>(),
        api.materialReconciliation<{ loggedByMaterial: LoggedLine[] }>(from, to),
        api.flagCustomPriced<unknown[]>({ from, to }),
        api.flagLateCancellations<unknown[]>({ from, to }),
        api.flagUnattendedJobs<unknown[]>(to),
        api.flagMaterialShortfalls<unknown[]>(from, to),
      ]);
      setReport(r); setInsights(i); setMaterials(mats); setLogged(recon.loggedByMaterial);
      setFlags({ customPriced: cp.length, lateCancellations: lc.length, unattended: uj.length, shortfalls: sf.length });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load analytics'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="loading"><RefreshCw className="spin" /><strong>Crunching the numbers</strong></div>;
  if (error) return <div className="error-state" role="alert"><AlertTriangle /><h2>Could not load analytics</h2><p>{error}</p><button className="button primary" onClick={() => load()}>Try again</button></div>;
  if (!report) return null;

  const up = report.revenue.changePercent >= 0;
  const periodLabel = preset === 'all' ? 'Last 12 months' : PRESETS.find(p => p.id === preset)!.label;
  const stock = (materialName: string) => materials.find(m => m.name === materialName);

  return (
    <div className="view-enter">
      <p className="muted" style={{ marginBottom: 12 }}>Showing: {periodLabel}</p>
      <section className="surface" style={{ marginBottom: 20 }}>
        <div className="section-title">
          <div><h2>What needs your attention</h2><p>Ranked by urgency, from what the system can actually see</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.id} className={preset === p.id ? 'button primary' : 'button ghost'} onClick={() => { setPreset(p.id); load(p.id); }}>
                {p.label}
              </button>
            ))}
            <button className="button ghost" onClick={() => load()}><RefreshCw />Refresh</button>
          </div>
        </div>
        <div className="insight-list" style={{ display: 'grid', gap: 10 }}>
          {insights.map(i => (
            <div key={i.id} className={`insight insight-${i.severity}`} style={{
              display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--line, #E8E9F2)',
              borderLeft: `4px solid ${i.severity === 'critical' ? '#C42A5C' : i.severity === 'warning' ? '#B8860B' : i.severity === 'opportunity' ? '#1177BF' : '#2EA54A'}`,
            }}>
              <span style={{ color: i.severity === 'critical' ? '#C42A5C' : i.severity === 'warning' ? '#B8860B' : i.severity === 'opportunity' ? '#1177BF' : '#2EA54A', flexShrink: 0 }}>{SEVERITY_ICON[i.severity]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{i.title}</strong>
                <p style={{ margin: '4px 0', fontSize: '0.86rem', opacity: 0.85 }}>{i.detail}</p>
                <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 600 }}>{i.action}</p>
              </div>
              {i.metric && <span className="category-chip" style={{ flexShrink: 0, alignSelf: 'center' }}>{i.metric}</span>}
              {i.view && <button className="button ghost" style={{ flexShrink: 0, alignSelf: 'center' }} onClick={() => go(i.view!)}>Open</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="stat-row" style={{ marginBottom: 20 }}>
        <div className="surface stat">
          <span><TrendingUp /> Net revenue</span>
          <strong>{money(report.revenue.netPesewas)}</strong>
          <small style={{ color: up ? '#2EA54A' : '#C42A5C', display: 'flex', alignItems: 'center', gap: 4 }}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{report.revenue.changePercent}% vs previous {report.windowDays} days
          </small>
        </div>
        <div className="surface stat"><span>Orders</span><strong>{report.orders.total}</strong><small>{report.orders.paid} paid · {report.orders.conversionPercent}% conversion</small></div>
        <div className="surface stat"><span>Average order</span><strong>{money(report.revenue.averageOrderPesewas)}</strong><small>{report.revenue.refundedPesewas ? `${money(report.revenue.refundedPesewas)} refunded` : 'No refunds'}</small></div>
        <div className="surface stat"><span>Repeat customers</span><strong>{report.customers.repeatRatePercent}%</strong><small>{report.customers.repeat} of {report.customers.total} · {report.customers.newInWindow} new</small></div>
      </section>

      <section className="surface" style={{ marginBottom: 20 }}>
        <div className="section-title"><div><h2>Revenue by day</h2><p>Paid orders less refunds, over the last {report.windowDays} days</p></div></div>
        <div style={{ padding: '0 20px 16px' }}><RevenueChart data={report.revenueByDay} /></div>
      </section>

      <section className="surface" style={{ marginBottom: 20 }}>
        <div className="section-title"><div><h2>Materials</h2><p>Used this period vs. currently remaining</p></div></div>
        {logged.length ? (
          <div className="data-table"><table>
            <thead><tr><th>Material</th><th>Used</th><th>Remaining</th></tr></thead>
            <tbody>{logged.map(l => {
              const m = stock(l.materialName);
              return (
                <tr key={l.materialName}>
                  <td><strong>{l.materialName}</strong></td>
                  <td className="number">{l.totalQuantity} {l.unit}</td>
                  <td className="number">{m ? `${m.stockQuantity} ${m.unit}` : '—'}{m?.lowStock && <small style={{ color: 'var(--color-red)', display: 'block' }}>Low stock</small>}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <p className="muted" style={{ padding: 20 }}>No material consumption logged in this period.</p>}
      </section>

      <section className="surface" style={{ marginBottom: 20 }}>
        <div className="section-title"><div><h2>Flags</h2><p>Every review flag for this period — open Controls → Flags for full detail</p></div></div>
        <div className="stat-row">
          <div className="surface stat"><span>Custom-priced items</span><strong>{flags.customPriced}</strong><button className="button ghost" onClick={() => go('controls')}>Open</button></div>
          <div className="surface stat"><span>Late cancellations/refunds</span><strong>{flags.lateCancellations}</strong><button className="button ghost" onClick={() => go('controls')}>Open</button></div>
          <div className="surface stat"><span>Unattended jobs</span><strong>{flags.unattended}</strong><button className="button ghost" onClick={() => go('controls')}>Open</button></div>
          <div className="surface stat"><span>Material shortfalls</span><strong>{flags.shortfalls}</strong><button className="button ghost" onClick={() => go('controls')}>Open</button></div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        <section className="surface">
          <div className="section-title"><div><h2>What sells</h2><p>Revenue by material</p></div></div>
          {report.topMaterials.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Material</th><th>Jobs</th><th>Area</th><th>Revenue</th></tr></thead>
              <tbody>{report.topMaterials.map(m => (
                <tr key={m.code}><td><strong>{m.name}</strong></td><td className="number">{m.jobs}</td><td className="number">{m.areaSqFt} ft²</td><td className="number"><strong>{money(m.revenuePesewas)}</strong></td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No large-format work in this period.</p>}
        </section>

        <section className="surface">
          <div className="section-title"><div><h2>Where orders come from</h2><p>Channel mix and average value</p></div></div>
          <div className="data-table"><table>
            <thead><tr><th>Channel</th><th>Orders</th><th>Revenue</th><th>Average</th></tr></thead>
            <tbody>{report.bySource.map(s => (
              <tr key={s.source}><td><span className="category-chip">{s.source.replace('_', ' ')}</span></td><td className="number">{s.orders}</td><td className="number">{money(s.revenuePesewas)}</td><td className="number">{money(s.averagePesewas)}</td></tr>
            ))}</tbody>
          </table></div>
        </section>

        <section className="surface">
          <div className="section-title"><div><h2>Best customers</h2><p>By lifetime value</p></div></div>
          {report.topCustomers.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Customer</th><th>Orders</th><th>Lifetime</th></tr></thead>
              <tbody>{report.topCustomers.map(c => (
                <tr key={c.id}><td><strong>{c.name || '—'}</strong><small>{c.email}</small></td><td className="number">{c.orderCount}</td><td className="number"><strong>{money(c.lifetimeValuePesewas)}</strong></td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No customers yet.</p>}
        </section>

        <section className="surface">
          <div className="section-title"><div><h2>Operations health</h2><p>What is moving and what is stuck</p></div></div>
          <div className="data-table"><table>
            <tbody>
              <tr><td>Open production jobs</td><td className="number"><strong>{report.production.openJobs}</strong></td></tr>
              <tr><td>Overdue</td><td className="number" style={{ color: report.production.overdue ? '#C42A5C' : undefined }}><strong>{report.production.overdue}</strong></td></tr>
              <tr><td>Blocked</td><td className="number">{report.production.blocked}</td></tr>
              <tr><td>Unassigned</td><td className="number">{report.production.unassigned}</td></tr>
              <tr><td>Open quote requests</td><td className="number">{report.quotes.open}</td></tr>
              <tr><td>Quote win rate</td><td className="number">{report.quotes.winRatePercent}%</td></tr>
              <tr><td>Out of stock</td><td className="number">{report.inventory.outOfStock}</td></tr>
              <tr><td>Low stock</td><td className="number">{report.inventory.lowStock}</td></tr>
            </tbody>
          </table></div>
        </section>
      </div>
    </div>
  );
}
