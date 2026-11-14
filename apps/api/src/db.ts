import { EntityManager, EntityTarget, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { SyncedCommand } from './entities';

// SQLite (used in dev) has no row-locking support; only take the pessimistic
// write lock on Postgres, where concurrent requests actually need it.
export function lockedFindOne<T extends ObjectLiteral>(manager: EntityManager, entity: EntityTarget<T>, where: FindOptionsWhere<T>): Promise<T | null> {
  const repo = manager.getRepository(entity);
  return manager.connection.options.type === 'postgres'
    ? repo.findOne({ where, lock: { mode: 'pessimistic_write' } })
    : repo.findOne({ where });
}

// Replays the saved result for a command id already processed, instead of re-running it.
export async function dedupeCommand<T>(manager: EntityManager, id: string, deviceId: string, actorEmail: string, run: () => Promise<T>): Promise<T> {
  const repo = manager.getRepository(SyncedCommand);
  const existing = await repo.findOne({ where: { id } });
  if (existing) {
    if (existing.actorEmail !== actorEmail) {
      throw new ConflictException('Command id already used by a different actor');
    }
    return JSON.parse(existing.result);
  }
  const result = await run();
  await repo.save({ id, deviceId, actorEmail, result: JSON.stringify(result) });
  return result;
}

export function assertVersion(current: number, expected: number | undefined): void {
  if (expected !== undefined && expected !== current) {
    throw new ConflictException('Version conflict');
  }
}
