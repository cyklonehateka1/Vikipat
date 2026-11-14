const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConflictException } = require('@nestjs/common');
const { dedupeCommand, assertVersion } = require('../dist/db');
const { SyncedCommand } = require('../dist/entities');

function fixture() {
  const rows = new Map();
  const repo = {
    findOne: async ({ where: { id } }) => rows.get(id) ?? null,
    save: async (row) => { rows.set(row.id, row); return row; },
  };
  const manager = { getRepository: (entity) => (entity === SyncedCommand ? repo : null) };
  return { manager, rows };
}

test('dedupeCommand runs the function once and returns the same result on a repeated id', async () => {
  const { manager } = fixture();
  let calls = 0;
  const run = async () => { calls += 1; return { ok: true, calls }; };
  const first = await dedupeCommand(manager, 'cmd-1', 'device-a', run);
  const second = await dedupeCommand(manager, 'cmd-1', 'device-b', run);
  assert.equal(calls, 1);
  assert.deepEqual(first, { ok: true, calls: 1 });
  assert.deepEqual(second, { ok: true, calls: 1 });
});

test('assertVersion throws ConflictException when expected does not match current', async () => {
  assert.throws(() => assertVersion(3, 2), (err) => err instanceof ConflictException);
});

test('assertVersion is a no-op when expected is undefined', async () => {
  assert.doesNotThrow(() => assertVersion(3, undefined));
});
