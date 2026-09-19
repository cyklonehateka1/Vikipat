const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');
const { ProductionJob, ProductionJobActivity, Order, OrderStatusHistory } = require('../dist/entities');

function fixture({ failAudit = false } = {}) {
  const state = { job: { id: 'job', orderId: 'order', jobNumber: 'VP-J1', stage: 'intake', internalNote: '', assignedTo: '' }, order: { id: 'order', orderNumber: 'VP', customerName: 'Customer', status: 'paid' }, activity: [], history: [] };
  const messages = [];
  let committed = false;
  const jobs = { manager: { transaction: async fn => {
    const draft = structuredClone(state);
    const repositories = new Map([
      [ProductionJob, { findOne: async () => draft.job, save: async job => job }],
      [Order, { findOne: async () => draft.order, save: async order => order }],
      [ProductionJobActivity, { save: async activity => { if (failAudit) throw new Error('audit failed'); draft.activity.push(activity); } }],
      [OrderStatusHistory, { save: async history => draft.history.push(history) }],
    ]);
    const result = await fn({ getRepository: entity => repositories.get(entity) });
    Object.assign(state, draft);
    committed = true;
    return result;
  } } };
  const notify = async (...args) => { assert.equal(committed, true, 'notify only after commit'); messages.push(args); };
  const service = new OrderService(null, null, null, null, jobs, null, null, null, null, null, { queueEmail: notify, queueWhatsApp: notify }, null);
  return { service, state, messages };
}

test('stage changes keep sensitive production notes in staff activity only', async () => {
  const { service, state, messages } = fixture();
  await service.updateProductionJob('job', { stage: 'artwork_review', internalNote: 'PRIVATE: supplier cost 900', assignedTo: 'Private operator' }, 'staff', 'admin');
  assert.equal(state.activity[0].note, 'PRIVATE: supplier cost 900');
  assert.equal(state.job.internalNote, state.activity[0].note);
  assert.equal(state.order.status, 'artwork_review');
  assert.equal(state.history[0].customerVisible, true);
  assert.equal(state.history[0].note, 'Your order is now Artwork review.');
  assert.equal(messages.length, 2);
  assert.doesNotMatch(JSON.stringify([state.history, messages.map(message => message[2])]), /PRIVATE|Private operator/);
});

test('assignment and note edits do not change order status or send customer updates', async () => {
  const { service, state, messages } = fixture();
  await service.updateProductionJob('job', { stage: 'intake', internalNote: 'Staff only', assignedTo: 'Designer' }, 'staff', 'admin');
  assert.equal(state.job.assignedTo, 'Designer');
  assert.equal(state.order.status, 'paid');
  assert.equal(state.history.length, 0);
  assert.equal(messages.length, 0);
  assert.equal(state.activity.length, 1);
});

test('retrying the same stage sends no duplicate customer update and allows clearing notes', async () => {
  const { service, state, messages } = fixture();
  await service.updateProductionJob('job', { stage: 'artwork_review', internalNote: 'Private' }, 'staff', 'admin');
  await service.updateProductionJob('job', { stage: 'artwork_review', internalNote: '' }, 'staff', 'admin');
  assert.equal(state.job.internalNote, '');
  assert.equal(state.history.length, 1);
  assert.equal(messages.length, 2);
});

test('audit failure rolls back job updates and sends no notification', async () => {
  const { service, state, messages } = fixture({ failAudit: true });
  await assert.rejects(service.updateProductionJob('job', { stage: 'artwork_review', internalNote: 'Private' }, 'staff', 'admin'), /audit failed/);
  assert.equal(state.job.stage, 'intake');
  assert.equal(state.job.internalNote, '');
  assert.equal(state.history.length, 0);
  assert.equal(messages.length, 0);
});

for (const [from, to] of [['intake', 'fulfilled'], ['intake', 'in_production'], ['in_production', 'ready'], ['blocked', 'fulfilled'], ['fulfilled', 'in_production'], ['cancelled', 'intake']]) {
  test(`rejects ${from} -> ${to} without writes or notifications`, async () => {
    const { service, state, messages } = fixture();
    state.job.stage = from;
    const before = structuredClone(state);
    await assert.rejects(service.updateProductionJob('job', { stage: to, internalNote: 'Invalid edit' }, 'staff', 'admin'), /Cannot move production job/);
    assert.deepEqual(state, before);
    assert.equal(messages.length, 0);
  });
}

for (const [from, to] of [['artwork_review', 'proofing'], ['proofing', 'artwork_review'], ['production_ready', 'in_production'], ['in_production', 'quality_check'], ['quality_check', 'in_production'], ['quality_check', 'ready'], ['ready', 'fulfilled'], ['blocked', 'artwork_review'], ['intake', 'cancelled']]) {
  test(`allows and audits ${from} -> ${to}`, async () => {
    const { service, state } = fixture();
    state.job.stage = from;
    await service.updateProductionJob('job', { stage: to }, 'staff', 'admin');
    assert.equal(state.job.stage, to);
    assert.equal(state.activity[0].fromStage, from);
    assert.equal(state.activity[0].toStage, to);
    assert.equal(state.activity[0].actor, 'staff', 'admin');
  });
}

test('completed jobs still allow staff-only assignment edits', async () => {
  const { service, state, messages } = fixture();
  state.job.stage = 'fulfilled';
  await service.updateProductionJob('job', { stage: 'fulfilled', assignedTo: 'Operator' }, 'staff', 'admin');
  assert.equal(state.job.assignedTo, 'Operator');
  assert.equal(messages.length, 0);
});

test('job list exposes allowed stages from the server policy', async () => {
  const { service } = fixture();
  service.jobs.find = async () => [{ id: 'done', stage: 'fulfilled' }, { id: 'qc', stage: 'quality_check' }];
  const jobs = await service.listProductionJobs('admin');
  assert.deepEqual(jobs[0].allowedStages, ['fulfilled']);
  assert.deepEqual(jobs[1].allowedStages, ['quality_check', 'ready', 'in_production', 'blocked', 'cancelled']);
});

for (const dto of [{stage:'artwork_review',assignedTo:'Other'}, {stage:'artwork_review',dueDate:'2026-09-20'}]) {
  test('specialist cannot smuggle assignment changes with a permitted stage change',async()=>{
    const {service,state,messages}=fixture();
    const before=structuredClone(state);
    await assert.rejects(service.updateProductionJob('job',dto,'designer','designer'),/assignment permission/);
    assert.deepEqual(state,before);
    assert.equal(messages.length,0);
  });
}

test('specialist stage permission rejection rolls back every edit',async()=>{
  const {service,state,messages}=fixture();
  state.job.stage='quality_check';
  const before=structuredClone(state);
  await assert.rejects(service.updateProductionJob('job',{stage:'ready',internalNote:'Private'},'operator','production_operator'),/Your role cannot/);
  assert.deepEqual(state,before);
  assert.equal(messages.length,0);
});

test('designer may move artwork and retain unchanged assignment metadata',async()=>{
  const {service,state}=fixture();
  await service.updateProductionJob('job',{stage:'artwork_review',assignedTo:'',internalNote:'Reviewed'},'designer','designer');
  assert.equal(state.job.stage,'artwork_review');
  assert.equal(state.activity[0].actor,'designer');
});
