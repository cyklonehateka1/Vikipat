import React from 'react';

export function SyncStatusBadge({status}: {status: 'pending' | 'conflict' | 'failed' | undefined}) {
  if (!status) return null;
  if (status === 'conflict' || status === 'failed') {
    return (
      <a href="#controls" className="status sync-conflict" title="See Flags → Sync conflicts">
        <i />
        {status === 'failed' ? 'Not synced' : 'Needs attention'}
      </a>
    );
  }
  return (
    <span className="status sync-pending">
      <i />
      Saved on this device
    </span>
  );
}
