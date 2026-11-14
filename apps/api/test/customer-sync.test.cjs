const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ConflictException } = require('@nestjs/common');
const { CustomerService } = require('../dist/customer.service');
const { Customer, AuditLog, SyncedCommand } = require('../dist/entities');

function fixture(customers = []) {
  const state = { customers: customers.map((c) => ({ phones: '[]', phoneIndex: '', company: '', orderCount: 0, lifetimeValuePesewas: 0, firstOrderAt: null, lastOrderAt: null, version: 1, ...c })), audit: [], commands: new Map() };
  let next = state.customers.length;
  const customerRepo = {
    create: (data) => ({ ...data }),
    findOneBy: async (where) => state.customers.find((c) => Object.entries(where).every(([k, v]) => c[k] === v)) || null,
    findOne: async ({ where }) => {
      const match = state.customers.find((c) => Object.entries(where).every(([k, v]) => c[k] === v));
      return match ? { ...match } : null;
    },
    save: async (c) => {
      if (!c.id) { c.id = `cust-${++next}`; state.customers.push(c); }
      else Object.assign(state.customers.find((x) => x.id === c.id), c);
      return c;
    },
    createQueryBuilder: () => {
      const q = { orderBy: () => q, limit: () => q, where: () => q, orWhere: () => q, getMany: async () => state.customers };
      return q;
    },
  };
  const empty = { find: async () => [] };
  const audits = { save: async (a) => { state.audit.push(a); return a; } };
  const syncedCommands = {
    findOne: async ({ where: { id } }) => state.commands.get(id) ?? null,
    save: async (row) => { state.commands.set(row.id, row); return row; },
  };
  const repos = new Map([[Customer, customerRepo], [AuditLog, audits], [SyncedCommand, syncedCommands]]);
  customerRepo.manager = {
    transaction: async (fn) => fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) }),
  };
  return { service: new CustomerService(customerRepo, empty, empty, audits), state };
}

test('creating a customer twice with the same commandId creates it only once', async () => {
  const { service, state } = fixture();
  const dto = { name: 'Ama Mensah', email: 'ama@example.com', commandId: 'cmd-1', deviceId: 'device-a' };
  const first = await service.createCustomer(dto, 'admin@vikipat.com');
  const second = await service.createCustomer(dto, 'admin@vikipat.com');
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(state.customers.length, 1);
  assert.equal(state.audit.length, 1);
});

test('updating a customer with a stale expectedVersion is rejected and the record is untouched', async () => {
  const { service, state } = fixture([{ id: 'cust-1', name: 'Kofi', email: 'kofi@example.com', version: 1 }]);
  const dto = { name: 'Kofi Boateng', expectedVersion: 2 };
  await assert.rejects(
    service.updateCustomer('cust-1', dto, 'admin@vikipat.com'),
    (err) => err instanceof ConflictException,
  );
  assert.equal(state.customers[0].name, 'Kofi');
  assert.equal(state.customers[0].version, 1);
  assert.equal(state.audit.length, 0);
});

test('updating a customer with a matching expectedVersion succeeds and bumps the version', async () => {
  const { service, state } = fixture([{ id: 'cust-1', name: 'Kofi', email: 'kofi@example.com', version: 1 }]);
  const dto = { name: 'Kofi Boateng', expectedVersion: 1 };
  const result = await service.updateCustomer('cust-1', dto, 'admin@vikipat.com');
  assert.equal(result.name, 'Kofi Boateng');
  assert.equal(state.customers[0].name, 'Kofi Boateng');
  assert.equal(state.customers[0].version, 2);
});

test('updating a customer twice with the same commandId applies the change only once', async () => {
  const { service, state } = fixture([{ id: 'cust-1', name: 'Kofi', email: 'kofi@example.com', version: 1 }]);
  const dto = { name: 'Kofi Boateng', commandId: 'cmd-2', deviceId: 'device-a' };
  const first = await service.updateCustomer('cust-1', dto, 'admin@vikipat.com');
  const second = await service.updateCustomer('cust-1', dto, 'admin@vikipat.com');
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(state.customers[0].version, 2);
  assert.equal(state.audit.length, 1);
});
