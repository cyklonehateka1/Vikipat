import 'fake-indexeddb/auto';
import './offline/testSessionStorage';
import {afterEach, expect, test, vi} from 'vitest';
import {moveJob, releaseOrder, setMaterialStock, setProductStock, updateCustomer} from './versionedActions';

afterEach(() => vi.unstubAllGlobals());

function capture() {
  const mock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({})});
  vi.stubGlobal('fetch', mock);
  return () => JSON.parse(mock.mock.calls[0][1].body as string);
}

test('releasing an order sends the version shown on screen', async () => {
  const body = capture();
  await releaseOrder({id: 'order-1', version: 3});
  expect(body().expectedVersion).toBe(3);
});

test('moving a job, editing a customer and setting stock all send the on-screen version', async () => {
  let body = capture();
  await moveJob({id: 'job-1', version: 5}, {stage: 'ready'});
  expect(body().expectedVersion).toBe(5);

  body = capture();
  await updateCustomer({id: 'c-1', version: 2}, {name: 'Ama'});
  expect(body().expectedVersion).toBe(2);

  body = capture();
  await setMaterialStock({id: 'm-1', version: 7}, 4, 'Recount');
  expect(body()).toMatchObject({stockQuantity: 4, expectedVersion: 7});

  body = capture();
  await setProductStock({id: 'p-1', version: 9}, 4, 'Recount');
  expect(body()).toMatchObject({stock: 4, expectedVersion: 9});
});
