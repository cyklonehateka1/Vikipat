import { EntityManager, EntityTarget, FindOptionsWhere, ObjectLiteral } from 'typeorm';

// SQLite (used in dev) has no row-locking support; only take the pessimistic
// write lock on Postgres, where concurrent requests actually need it.
export function lockedFindOne<T extends ObjectLiteral>(manager: EntityManager, entity: EntityTarget<T>, where: FindOptionsWhere<T>): Promise<T | null> {
  const repo = manager.getRepository(entity);
  return manager.connection.options.type === 'postgres'
    ? repo.findOne({ where, lock: { mode: 'pessimistic_write' } })
    : repo.findOne({ where });
}
