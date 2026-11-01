const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hasPermission } = require('@vikipat/domain');

test('operations_supervisor can release unpaid orders, a production operator cannot', () => {
  assert.equal(hasPermission('operations_supervisor', 'jobs.release_unpaid'), true);
  assert.equal(hasPermission('production_operator', 'jobs.release_unpaid'), false);
});
