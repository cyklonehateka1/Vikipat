const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { AuthGuard, AdminOnlyGuard, OperationsGuard, PasswordChangedGuard, CsrfGuard } = require('../dist/security');
const { permissionsForRole, STAFF_ROLES } = require('@vikipat/domain');
const { permittedProductionStages } = require('../dist/production-workflow');
const context = request => ({switchToHttp: () => ({getRequest: () => request})});

test('authentication uses current database identity and permissions, not stale JWT claims', async () => {
  const request = {cookies: {admin_session: 'signed-token'}};
  const guard = new AuthGuard({verifyAsync: async () => ({id:'1', role:'admin',email:'old',tokenVersion:0,csrf:'csrf'})}, {findOneBy: async () => ({id:'1',role:'designer',name:'Designer',email:'designer@example.test',tokenVersion:0,isActive:true,mustChangePassword:false})});
  assert.equal(await guard.canActivate(context(request)), true);
  assert.equal(request.user.role,'designer');
  assert.equal(request.user.name,'Designer');
  assert.equal(request.user.email,'designer@example.test');
  assert.deepEqual(request.user.permissions,permissionsForRole('designer'));
  assert.throws(()=>new AdminOnlyGuard().canActivate(context(request)),/Administrator access/);
});

for (const change of [{isActive:false}, {tokenVersion:1}, {role:'unknown'}, null]) {
  test(`rejects revoked/invalid identity ${JSON.stringify(change)}`, async () => {
    const user=change&&{role:'designer',isActive:true,tokenVersion:0,...change};
    const guard=new AuthGuard({verifyAsync:async()=>({id:'1',tokenVersion:0})},{findOneBy:async()=>user});
    await assert.rejects(guard.canActivate(context({cookies:{admin_session:'token'}})),/Session is no longer valid/);
  });
}

test('first login and CSRF requirements still apply to staff', () => {
  const request={user:{mustChangePassword:true,csrf:'correct'},method:'PATCH',headers:{'x-csrf-token':'wrong'}};
  assert.throws(()=>new PasswordChangedGuard().canActivate(context(request)),/Password change required/);
  assert.throws(()=>new CsrfGuard().canActivate(context(request)),/Invalid CSRF/);
});

for (const role of STAFF_ROLES) {
  test(`${role} can enter operations but cannot enter administration`,()=>{
    const request={user:{role,permissions:permissionsForRole(role)}};
    assert.equal(new OperationsGuard().canActivate(context(request)),true);
    assert.throws(()=>new AdminOnlyGuard().canActivate(context(request)),/Administrator access/);
  });
}

test('specialist roles cannot cancel or act in other departments',()=>{
  assert.deepEqual(permittedProductionStages('in_production','designer'),['in_production']);
  assert.deepEqual(permittedProductionStages('quality_check','production_operator'),['quality_check']);
  assert.deepEqual(permittedProductionStages('ready','quality_control'),['ready']);
  assert.deepEqual(permittedProductionStages('blocked','dispatch'),['blocked']);
  assert.deepEqual(permittedProductionStages('intake','unknown'),[]);
  assert.ok(permittedProductionStages('ready','dispatch').includes('fulfilled'));
  assert.ok(permittedProductionStages('quality_check','quality_control').includes('in_production'));
  assert.ok(permittedProductionStages('blocked','operations_supervisor').includes('artwork_review'));
});

const { StaffService } = require('../dist/staff.service');
const { User, AuditLog } = require('../dist/entities');

test('staff role changes roll back with their audit record',async()=>{
  const original={id:'staff',role:'designer',isActive:true,tokenVersion:2};
  const state=structuredClone(original);
  const service=new StaffService({manager:{transaction:async fn=>{
    const draft=structuredClone(state);
    const repositories=new Map([
      [User,{findOne:async()=>draft,save:async()=>draft}],
      [AuditLog,{save:async()=>{throw new Error('Audit unavailable')}}],
    ]);
    const result=await fn({getRepository:entity=>repositories.get(entity)});
    Object.assign(state,draft);
    return result;
  }}});
  await assert.rejects(service.update('staff',{role:'dispatch',isActive:false},'admin','admin@example.test'),/Audit unavailable/);
  assert.deepEqual(state,original);
});

test('staff management cannot alter own access or an administrator account',async()=>{
  const service=new StaffService({manager:{transaction:async fn=>fn({getRepository:()=>({findOne:async()=>({role:'admin'})})})}});
  await assert.rejects(service.update('admin',{role:'dispatch',isActive:false},'admin','admin@example.test'),/own access/);
  await assert.rejects(service.update('other-admin',{role:'dispatch',isActive:false},'admin','admin@example.test'),/Administrator accounts/);
});
