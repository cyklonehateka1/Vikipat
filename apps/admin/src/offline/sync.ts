import {listCommands, updateCommandStatus} from './queue';
import type {QueuedCommand} from './queue';
import type {api as Api} from '../api';

type CommandHandler = (payload: any) => Promise<unknown>;

export const commandHandlers: Record<string, CommandHandler> = {};

let defaultsLoaded = false;

// api.ts touches browser-only globals at module load, so it's pulled in
// lazily rather than imported at the top of this file (tests supply their
// own handlers and never need the real module).
async function ensureDefaultHandlers(): Promise<void> {
  if (defaultsLoaded) return;
  defaultsLoaded = true;

  try {
    const {api}: {api: typeof Api} = await import('../api');
    const defaults: Record<string, CommandHandler> = {
      'order.create': (payload) => api.createOrder(payload),
      'payment.record': (payload) => api.recordPayment(payload.orderId, payload),
      'refund.record': (payload) => api.recordRefund(payload.orderId, payload),
      'order.release': (payload) => api.releaseOrder(payload.orderId, payload.overrideReason),
      'productionJob.update': (payload) => api.updateProductionJob(payload.jobId, payload),
      'customer.create': (payload) => api.createCustomer(payload),
      'customer.update': (payload) => api.updateCustomer(payload.customerId, payload),
      'material.adjustStock': (payload) => api.adjustMaterialStock(payload.materialId, payload),
      'material.recordCount': (payload) => api.recordMaterialCount(payload.materialId, payload),
      'stock.adjust': (payload) => api.adjustStock(payload.productId, payload.stock, payload.reason),
    };

    for (const [type, handler] of Object.entries(defaults)) {
      if (!(type in commandHandlers)) commandHandlers[type] = handler;
    }
  } catch {
    // api module unavailable in this environment; callers are expected to
    // have populated commandHandlers themselves (e.g. tests).
  }
}

export function raiseConflictFlag(command: QueuedCommand, serverState: object): void {
  console.log('conflict flag raised', command.id, serverState);
}

export async function runSyncPass(): Promise<{synced: number; conflicts: number; failed: number}> {
  await ensureDefaultHandlers();

  const pending = await listCommands('pending');
  const failed = await listCommands('failed');
  const commands = [...pending, ...failed];

  let synced = 0;
  let conflicts = 0;
  let failedCount = 0;

  for (const command of commands) {
    const handler = commandHandlers[command.type];
    await updateCommandStatus(command.id, 'syncing');

    try {
      await handler(command.payload);
      await updateCommandStatus(command.id, 'synced');
      synced++;
    } catch (error) {
      const status = (error as {status?: number}).status;

      if (status === 409) {
        const serverState = (error as {body?: object}).body ?? {};
        await updateCommandStatus(command.id, 'conflict', {conflictState: serverState});
        raiseConflictFlag(command, serverState);
        conflicts++;
      } else if (status === 401 || status === 403) {
        await updateCommandStatus(command.id, 'pending');
        break;
      } else {
        await updateCommandStatus(command.id, 'failed');
        failedCount++;
      }
    }
  }

  return {synced, conflicts, failed: failedCount};
}

export function startSyncLoop(intervalMs: number): () => void {
  void runSyncPass();

  const onOnline = () => {
    void runSyncPass();
  };

  window.addEventListener('online', onOnline);
  const interval = setInterval(() => {
    void runSyncPass();
  }, intervalMs);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', onOnline);
  };
}
