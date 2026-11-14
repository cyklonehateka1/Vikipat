const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { CustomerService } = require('../dist/customer.service');

function fixture(customers = []) {
  const state = { customers: customers.map((c) => ({ phones: '[]', phoneIndex: '', company: '', orderCount: 0, lifetimeValuePesewas: 0, firstOrderAt: null, lastOrderAt: null, ...c })), audit: [] };
  let next = state.customers.length;
  const customerRepo = {
    create: (data) => ({ ...data }),
    findOneBy: async (where) => state.customers.find((c) => Object.entries(where).every(([k, v]) => c[k] === v)) || null,
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
  return { service: new CustomerService(customerRepo, empty, empty, audits), state };
}

test('creating a customer with a new email succeeds, is listed and audited', async () => {
  const { service, state } = fixture();
  const created = await service.createCustomer({ name: 'Ama Mensah', email: 'Ama@Example.com', phone: '0241234567', company: 'Ama Ltd' }, 'admin@vikipat.com');
  assert.equal(created.email, 'ama@example.com');
  const listed = await service.list();
  assert.ok(listed.some((c) => c.id === created.id && c.name === 'Ama Mensah' && c.phones[0] === '0241234567'));
  assert.equal(state.audit.length, 1);
  assert.equal(state.audit[0].action, 'customer_created');
  assert.equal(state.audit[0].entity, 'customer');
  assert.equal(state.audit[0].entityId, created.id);
  assert.equal(state.audit[0].actorEmail, 'admin@vikipat.com');
  assert.equal(JSON.parse(state.audit[0].details).name, 'Ama Mensah');
});

test('creating a customer with an email another customer holds is rejected', async () => {
  const { service, state } = fixture([{ id: 'cust-1', name: 'Kofi', email: 'kofi@example.com' }]);
  await assert.rejects(service.createCustomer({ name: 'Someone', email: 'KOFI@example.com' }, 'admin@vikipat.com'), /already/);
  assert.equal(state.customers.length, 1);
  assert.equal(state.audit.length, 0);
});
