import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from './api';
import { Empty, when } from './main';

type Notification = {
  id: string; orderId: string; channel: 'email' | 'whatsapp'; recipient: string; template: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'; attempts: number; lastError: string;
  createdAt: string; updatedAt: string;
};

const errorText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';

export default function Communications({ notify }: { notify: (text: string) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'failed' | 'sent' | 'pending'>('failed');

  async function load() {
    setLoading(true); setError('');
    try { setItems(await api.notifications<Notification[]>()); }
    catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function retry(id: string) {
    setRetrying(id); setError('');
    try {
      await api.retryNotification(id);
      await load();
      notify('Notification retried');
    } catch (e) { setError(errorText(e)); }
    finally { setRetrying(null); }
  }

  const visible = items.filter((n) => filter === 'all' || n.status === filter);
  const failedCount = items.filter((n) => n.status === 'failed').length;

  if (loading) return <section className="surface view-enter" role="status">Loading notifications…</section>;

  return (
    <section className="surface view-enter">
      <div className="section-title">
        <div>
          <h2>Communications</h2>
          <p>Order emails and WhatsApp messages queued by the system, and why any of them failed.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button ghost" onClick={load}><RefreshCw />Refresh</button>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="quote-tabs" style={{ marginBottom: 12 }}>
        {(['failed', 'pending', 'sent', 'all'] as const).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'failed' ? `Failed (${failedCount})` : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="data-table">
          <table>
            <thead><tr><th>Recipient</th><th>Channel</th><th>Template</th><th>Status</th><th>Error</th><th>Sent / queued</th><th /></tr></thead>
            <tbody>
              {visible.map((n) => (
                <tr key={n.id}>
                  <td>{n.recipient}</td>
                  <td><span className="category-chip">{n.channel}</span></td>
                  <td>{n.template.replaceAll('_', ' ')}</td>
                  <td><span className={'status ' + (n.status === 'sent' ? 'active' : n.status === 'failed' ? 'draft' : 'new')}><i />{n.status}</span></td>
                  <td>{n.lastError || '—'}</td>
                  <td>{when(n.createdAt)}</td>
                  <td>
                    {['pending', 'failed'].includes(n.status) && (
                      <button className="button ghost" disabled={retrying === n.id} onClick={() => retry(n.id)}>
                        {retrying === n.id ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={<RefreshCw />} title="Nothing here" copy="No notifications match this filter." />
      )}
    </section>
  );
}
