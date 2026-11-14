import React from 'react';

export function SyncStatusBadge({status}: {status: 'pending' | 'conflict' | undefined}) {
  if (!status) return null;
  if (status === 'conflict') {
    return (
      <a href="#controls" className="status sync-conflict" title="See Flags → Sync conflicts">
        <i />
        Needs attention
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
