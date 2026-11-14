import {listCommands, updateCommandStatus} from './queue';

type CommandHandler = (payload: any) => Promise<unknown>;

export const commandHandlers: Record<string, CommandHandler> = {};

export type SyncOptions = {actor?: string; onAuthPaused?: () => void};

let defaultsLoaded = false;

// api.ts touches browser globals at load, so it is imported lazily.
async function ensureDefaultHandlers(): Promise<void> {
  if (defaultsLoaded) return;
  defaultsLoaded = true;

  try {
    const {commandTypes, sendCommand} = await import('../api');
    for (const type of commandTypes) {
      if (!(type in commandHandlers)) commandHandlers[type] = (payload) => sendCommand(type, payload);
    }
  } catch {
    // no api module here (tests register their own handlers)
  }
}

export async function runSyncPass(options: SyncOptions = {}): Promise<{synced: number; conflicts: number; failed: number}> {
  await ensureDefaultHandlers();

  const pending = await listCommands('pending');
  const failed = await listCommands('failed');
  const commands = [...pending, ...failed];

  let synced = 0;
  let conflicts = 0;
  let failedCount = 0;

  for (const command of commands) {
    // Another staff member's changes wait for them to sign in again.
    if (command.actor && command.actor !== options.actor) continue;

    const handler = commandHandlers[command.type];
    if (!handler) {
      await updateCommandStatus(command.id, 'failed', {lastError: `Unknown command type ${command.type}`});
      failedCount++;
      continue;
    }
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
        conflicts++;
      } else if (status === 401) {
        await updateCommandStatus(command.id, command.status === 'failed' ? 'failed' : 'pending');
        options.onAuthPaused?.();
        break;
      } else if (error instanceof TypeError) {
        await updateCommandStatus(command.id, command.status === 'failed' ? 'failed' : 'pending');
        break;
      } else {
        await updateCommandStatus(command.id, 'failed', {lastError: (error as Error).message || 'Request failed'});
        failedCount++;
      }
    }
  }

  return {synced, conflicts, failed: failedCount};
}

export function startSyncLoop(intervalMs: number, options: SyncOptions = {}): () => void {
  const pass = () => void runSyncPass(options);
  pass();

  window.addEventListener('online', pass);
  const interval = setInterval(pass, intervalMs);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', pass);
  };
}
