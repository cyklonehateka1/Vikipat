import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Empty } from './main';

type Tab = 'flags' | 'materials' | 'reconciliation';

const TAB_LABEL: Record<Tab, string> = { flags: 'Flags', materials: 'Materials', reconciliation: 'Reconciliation' };

/**
 * Owner-only review surface: payment-override log, material stock and
 * per-job consumption, and the material/billed-area reconciliation report.
 * Each tab below is a placeholder; later work fills them with real data.
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

      {tab === 'materials' && (
        <section className="surface">
          <Empty icon={<ShieldAlert />} title="Nothing here yet" copy="Raw-material stock and per-job consumption will be tracked here." />
        </section>
      )}

      {tab === 'reconciliation' && (
        <section className="surface">
          <Empty icon={<ShieldAlert />} title="Nothing here yet" copy="Billed area by service code and logged material consumption will be compared here." />
        </section>
      )}
    </div>
  );
}
