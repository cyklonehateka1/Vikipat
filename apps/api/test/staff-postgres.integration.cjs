// Isolated real HTTP/PostgreSQL checks. No existing database or .env files are used.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {execFileSync,spawn}=require('node:child_process');
const {createServer}=require('node:net');
const {Client}=require('pg');
const {randomUUID,createHmac}=require('node:crypto');
const {hash}=require('bcryptjs');
const {JwtService}=require('@nestjs/jwt');
const testSecret='test-only-staff-authentication-secret-'.repeat(3);
const root=join(__dirname,'..','..','..');
let scratch,pgStarted=false,server,db,base,admin,designer,operator,supervisor,jobId,orderId;
const password='Test-Staff-Password-29!';
const newPassword='Changed-Staff-Password-29!';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function port(){const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function request(path,session,method='GET',body,csrf=true){
  const response=await fetch(base+path,{method,headers:{...(session?{Cookie:session.cookie}:{}),...(session&&csrf?{'X-CSRF-Token':session.csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function login(email,pass=password){const result=await request('/auth/login',null,'POST',{email,password:pass});assert.equal(result.status,201,JSON.stringify(result.data));return {cookie:result.cookie,csrf:result.data.csrfToken,user:result.data.user};}
async function seed(role){const id=randomUUID(),email=role+'@example.test';await db.query('INSERT INTO users (id,email,name,role,"passwordHash","mustChangePassword") VALUES ($1,$2,$3,$4,$5,false)',[id,email,role,role,await hash(password,4)]);const token=await new JwtService({secret:testSecret}).signAsync({id,email,role,tokenVersion:0,csrf:'test-csrf'},{issuer:'vikipat-api',audience:'vikipat-admin',expiresIn:'1h'});return {id,cookie:'admin_session='+token,csrf:'test-csrf'};}

before(async()=>{
  scratch=mkdtempSync(join(tmpdir(),'vikipat-staff-tests-'));
  const pgPort=await port(),apiPort=await port();
  execFileSync('initdb',['-D',join(scratch,'db'),'-A','trust','-U','vikipat_test','--no-locale'],{stdio:'pipe'});
  execFileSync('pg_ctl',['-D',join(scratch,'db'),'-l',join(scratch,'postgres.log'),'-o',`-h 127.0.0.1 -p ${pgPort} -k ${scratch}`,'-w','start'],{stdio:'pipe'});pgStarted=true;
  db=new Client({host:'127.0.0.1',port:pgPort,user:'vikipat_test',database:'postgres'});await db.connect();
  // Test the migration against an existing pre-staff account, then let the API run all migrations.
  await db.query('CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email varchar UNIQUE NOT NULL,"passwordHash" varchar NOT NULL,"mustChangePassword" boolean NOT NULL DEFAULT true,name varchar NOT NULL DEFAULT \'Admin\',role varchar NOT NULL DEFAULT \'admin\',"tokenVersion" integer NOT NULL DEFAULT 0,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now())');
  await db.query('INSERT INTO users (id,email,name,role,"passwordHash","mustChangePassword") VALUES ($1,$2,$3,$4,$5,false)',[randomUUID(),'admin@example.test','Test Admin','admin',await hash(password,4)]);
  let output='';
  server=spawn(process.execPath,[join(root,'apps/api/.test-runtime/main.js')],{cwd:scratch,env:{...process.env,NODE_ENV:'test',DATABASE_DRIVER:'postgres',POSTGRES_HOST:'127.0.0.1',POSTGRES_PORT:String(pgPort),POSTGRES_USER:'vikipat_test',POSTGRES_DB:'postgres',POSTGRES_PASSWORD:'',POSTGRES_SSL:'false',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:password,PORT:String(apiPort),HOST:'127.0.0.1',COOKIE_SECURE:'false',JWT_SECRET:'test-only-staff-authentication-secret-'.repeat(3),PAYSTACK_SECRET_KEY:'test-only-paystack-signing-key',SMTP_HOST:'',WHATSAPP_API_URL:'',WHATSAPP_ACCESS_TOKEN:'',CORS_ORIGINS:'http://127.0.0.1:5179'},stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',chunk=>output+=chunk);server.stderr.on('data',chunk=>output+=chunk);
  base=`http://127.0.0.1:${apiPort}/api`;
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/auth/me')).status===401){ready=true;break}}catch{}if(server.exitCode!==null)break;await delay(100);}
  assert.ok(ready,output);
  admin=await login('admin@example.test');designer=await seed('designer');operator=await seed('production_operator');supervisor=await seed('operations_supervisor');
  orderId=randomUUID();jobId=randomUUID();
  await db.query('INSERT INTO orders (id,"orderNumber","customerName","customerEmail",status,"paymentStatus") VALUES ($1,$2,$3,$4,$5,$6)',[orderId,'VP-TEST0001','Test customer','customer@example.test','paid','paid']);
  await db.query('INSERT INTO production_jobs (id,"orderId","orderItemId","orderNumber","jobNumber","customerName","serviceCode",title,quantity,stage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9)',[jobId,orderId,randomUUID(),'VP-TEST0001','VP-TEST0001-J1','Test customer','sav-sticker','Test print','intake']);
}, {timeout:30000});

after(async()=>{
  if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
  if(db)await db.end();
  if(pgStarted)execFileSync('pg_ctl',['-D',join(scratch,'db'),'-m','fast','-w','stop'],{stdio:'pipe'});
  if(scratch)rmSync(scratch,{recursive:true,force:true});
});

test('migration keeps existing admins active and staff responses omit secrets',async()=>{
  const result=await request('/admin/staff',admin);assert.equal(result.status,200);
  assert.equal(result.data.staff.find(user=>user.role==='admin').isActive,true);
  assert.doesNotMatch(JSON.stringify(result.data),/passwordHash|tokenVersion|temporaryPassword/);
});

test('all operational roles are barred from admin routes and legacy status mutation',async()=>{
  const routes=[['/admin/products','GET'],['/admin/settings','GET'],['/admin/dashboard','GET'],['/admin/activity','GET'],['/admin/quotes','GET'],['/admin/payments','GET'],['/admin/payments/summary','GET'],['/admin/pricing/rules','GET'],['/admin/staff','GET'],['/admin/orders','GET'],[`/admin/orders/${orderId}/status`,'PATCH'],['/admin/orders','POST'],['/admin/staff','POST']];
  for(const session of [designer,operator,supervisor])for(const [path,method]of routes){const result=await request(path,session,method,method==='GET'?undefined:{});assert.equal(result.status,403,path);}
});

test('specialists can read jobs and add notes but not release, assign, or skip departments',async()=>{
  let result=await request('/admin/orders/production/jobs',designer);assert.equal(result.status,200);assert.deepEqual(result.data[0].allowedStages,['intake','artwork_review','blocked']);
  result=await request(`/admin/orders/${orderId}/release`,designer,'POST');assert.equal(result.status,403);
  result=await request(`/admin/orders/production/jobs/${jobId}`,designer,'PATCH',{stage:'artwork_review',assignedTo:'Unauthorized'});assert.equal(result.status,403);
  assert.equal((await db.query('SELECT stage FROM production_jobs WHERE id=$1',[jobId])).rows[0].stage,'intake');
  result=await request(`/admin/orders/production/jobs/${jobId}`,operator,'PATCH',{stage:'artwork_review'});assert.equal(result.status,403);
  result=await request(`/admin/orders/production/jobs/${jobId}/activity`,designer,'POST',{note:'Staff-only test note'});assert.equal(result.status,201);
  result=await request(`/admin/orders/production/jobs/${jobId}`,designer,'PATCH',{stage:'artwork_review'});assert.equal(result.status,200);
  const activity=(await db.query('SELECT * FROM production_job_activity WHERE "jobId"=$1',[jobId])).rows;assert.equal(activity.length,2);assert.ok(activity.every(row=>row.actor==='designer@example.test'));
});

test('supervisor intake query excludes released jobs and permits assignment',async()=>{
  let result=await request('/admin/orders/production/intake',supervisor);assert.equal(result.status,200);assert.deepEqual(result.data,[]);
  const pending=randomUUID();await db.query('INSERT INTO orders (id,"orderNumber","customerName","customerEmail",status,"paymentStatus") VALUES ($1,$2,$3,$4,$5,$6)',[pending,'VP-TEST0002','Pending customer','pending@example.test','paid','paid']);
  result=await request('/admin/orders/production/intake',supervisor);assert.equal(result.status,200);assert.equal(result.data.length,1);assert.equal(result.data[0].id,pending);assert.equal(result.data[0].customerEmail,undefined);
  result=await request(`/admin/orders/production/jobs/${jobId}`,supervisor,'PATCH',{stage:'artwork_review',assignedTo:'Designer',dueDate:'2026-10-01'});assert.equal(result.status,200);assert.equal(result.data.assignedTo,'Designer');
});

test('staff creation validates roles, enforces CSRF, and forces first-login password change',async()=>{
  const draft={name:'New Staff',email:'new@example.test',role:'dispatch',temporaryPassword:password};
  let result=await request('/admin/staff',admin,'POST',draft,false);assert.equal(result.status,403);
  result=await request('/admin/staff',admin,'POST',{...draft,role:'admin'});assert.equal(result.status,400);
  result=await request('/admin/staff',admin,'POST',{...draft,temporaryPassword:'weak'});assert.equal(result.status,400);
  result=await request('/admin/staff',admin,'POST',draft);assert.equal(result.status,201);assert.equal(result.data.mustChangePassword,true);assert.doesNotMatch(JSON.stringify(result.data),/passwordHash|temporaryPassword/);
  result=await request('/admin/staff',admin,'POST',draft);assert.equal(result.status,409);
  let session=await login(draft.email);assert.equal((await request('/admin/orders/production/jobs',session)).status,403);
  result=await request('/auth/change-password',session,'POST',{currentPassword:password,newPassword});assert.equal(result.status,201);
  assert.equal((await request('/auth/me',session)).status,401);
  session=await login(draft.email,newPassword);assert.equal((await request('/admin/orders/production/jobs',session)).status,200);
});

test('role change revokes old sessions; deactivation rejects login and existing sessions',async()=>{
  let result=await request(`/admin/staff/${designer.id}`,admin,'PATCH',{role:'quality_control',isActive:true});assert.equal(result.status,200);
  assert.equal((await request('/auth/me',designer)).status,401);
  const fresh=await login('designer@example.test');assert.equal(fresh.user.role,'quality_control');
  result=await request(`/admin/staff/${designer.id}`,admin,'PATCH',{role:'quality_control',isActive:false});assert.equal(result.status,200);
  assert.equal((await request('/admin/orders/production/jobs',fresh)).status,401);
  result=await request('/auth/login',null,'POST',{email:'designer@example.test',password});assert.equal(result.status,401);
  const audits=(await db.query('SELECT * FROM audit_log WHERE "entityId"=$1',[designer.id])).rows;assert.equal(audits.filter(row=>row.action==='staff_access_updated').length,2);assert.doesNotMatch(JSON.stringify(audits),/passwordHash|temporaryPassword/);
});

async function releaseOrderFixture({source='online',paymentStatus='paid',status='paid',requiresReview=false,count=2,invalidSpec=false}={}){
  const id=randomUUID(),number='VP-'+randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
  await db.query('INSERT INTO orders (id,"orderNumber","customerName","customerEmail",source,status,"paymentStatus","requiresReview","totalPesewas") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,2000)',[id,number,'Release customer','release@example.test',source,status,paymentStatus,requiresReview]);
  for(let i=0;i<count;i++)await db.query('INSERT INTO order_items (id,"orderId","serviceCode",name,quantity,"unitPricePesewas","totalPesewas",specification) VALUES ($1,$2,$3,$4,1,1000,1000,$5)',[randomUUID(),id,'sav-sticker','Print '+i,invalidSpec&&i===count-1?'invalid JSON':JSON.stringify({needsDesign:i===1})]);
  return {id,number};
}
async function paymentFixture(order){
  const reference='release-test-'+randomUUID();
  await db.query('INSERT INTO payment_transactions (id,"orderId","orderNumber",provider,reference,"amountPesewas",currency,status) VALUES ($1,$2,$3,$4,$5,2000,$6,$7)',[randomUUID(),order.id,order.number,'paystack',reference,'GHS','pending']);
  return reference;
}
async function webhook(reference,amount=2000){
  const body=JSON.stringify({event:'charge.success',data:{reference,amount,currency:'GHS',status:'success'}});
  const signature=createHmac('sha512','test-only-paystack-signing-key').update(body).digest('hex');
  const response=await fetch(base+'/payments/paystack/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-paystack-signature':signature},body});
  return {status:response.status,data:await response.json()};
}
async function releaseState(id){
  const jobs=(await db.query('SELECT * FROM production_jobs WHERE "orderId"=$1 ORDER BY "jobNumber"',[id])).rows;
  const activity=(await db.query('SELECT * FROM production_job_activity WHERE "orderId"=$1',[id])).rows;
  const history=(await db.query('SELECT * FROM order_status_history WHERE "orderId"=$1',[id])).rows;
  const outbox=(await db.query('SELECT * FROM notification_outbox WHERE "orderId"=$1',[id])).rows;
  return {jobs,activity,history,outbox};
}

test('concurrent staff releases return the same jobs, with one release audit and notification set',async()=>{
  const order=await releaseOrderFixture();
  const results=await Promise.all(Array.from({length:8},()=>request(`/admin/orders/${order.id}/release`,supervisor,'POST')));
  for(const result of results){assert.equal(result.status,201,JSON.stringify(result.data));assert.deepEqual(result.data.map(job=>job.id),results[0].data.map(job=>job.id));}
  const state=await releaseState(order.id);
  assert.equal(state.jobs.length,2);assert.equal(state.activity.length,2);assert.equal(state.history.length,1);assert.equal(state.outbox.length,1);
  assert.ok(state.activity.every(row=>row.actor==='operations_supervisor@example.test'));
  const retry=await request(`/admin/orders/${order.id}/release`,supervisor,'POST');assert.equal(retry.status,201);
  assert.deepEqual(await releaseState(order.id),state);
});

test('duplicate signed payment webhooks release once, including per-job audits and one receipt',async()=>{
  const order=await releaseOrderFixture({paymentStatus:'unpaid',status:'awaiting_payment'}),reference=await paymentFixture(order);
  const results=await Promise.all(Array.from({length:8},()=>webhook(reference)));
  assert.ok(results.every(result=>result.status===201),JSON.stringify(results));
  assert.equal(results.filter(result=>result.data.idempotent===false).length,1);
  const state=await releaseState(order.id);
  assert.equal(state.jobs.length,2);assert.equal(state.activity.length,2);assert.equal(state.history.length,2);
  assert.ok(state.activity.every(row=>row.actor==='paystack'));
  assert.equal(state.outbox.filter(row=>row.template==='payment_received').length,1);
  assert.equal(state.outbox.filter(row=>row.template==='order_status').length,1);
  assert.equal((await db.query('SELECT status FROM payment_transactions WHERE reference=$1',[reference])).rows[0].status,'paid');
  assert.equal((await db.query('SELECT status FROM orders WHERE id=$1',[order.id])).rows[0].status,'artwork_review');
  const retry=await request(`/admin/orders/${order.id}/release`,supervisor,'POST');assert.equal(retry.status,201);
  assert.deepEqual(await releaseState(order.id),state);
});

test('staff release racing payment confirmation cannot duplicate jobs or release history',async()=>{
  const order=await releaseOrderFixture({paymentStatus:'unpaid',status:'awaiting_payment'}),reference=await paymentFixture(order);
  const results=await Promise.all([request(`/admin/orders/${order.id}/release`,supervisor,'POST'),webhook(reference)]);
  assert.ok([201,400].includes(results[0].status));assert.equal(results[1].status,201);
  assert.equal((await request(`/admin/orders/${order.id}/release`,supervisor,'POST')).status,201);
  const state=await releaseState(order.id);
  assert.equal(state.jobs.length,2);assert.equal(state.activity.length,2);assert.equal(state.history.length,2);assert.equal(state.outbox.length,2);
});

for(const options of [{paymentStatus:'unpaid',status:'awaiting_payment'},{status:'cancelled'},{status:'completed'},{status:'on_hold'},{requiresReview:true},{count:0},{invalidSpec:true}]){
  test(`invalid staff release leaves no writes: ${JSON.stringify(options)}`,async()=>{
    const order=await releaseOrderFixture(options);
    const result=await request(`/admin/orders/${order.id}/release`,supervisor,'POST');assert.equal(result.status,400,JSON.stringify(result.data));
    assert.deepEqual(await releaseState(order.id),{jobs:[],activity:[],history:[],outbox:[]});
  });
}

test('release audit failure rolls back payment, jobs, history and notifications; retry succeeds',async()=>{
  const order=await releaseOrderFixture({paymentStatus:'unpaid',status:'awaiting_payment'}),reference=await paymentFixture(order);
  await db.query(`CREATE FUNCTION reject_release_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test audit failure'; END; $$`);
  await db.query('CREATE TRIGGER reject_release_audit BEFORE INSERT ON production_job_activity FOR EACH ROW EXECUTE FUNCTION reject_release_audit()');
  try{
    assert.equal((await webhook(reference)).status,500);
    assert.deepEqual(await releaseState(order.id),{jobs:[],activity:[],history:[],outbox:[]});
    assert.equal((await db.query('SELECT status FROM payment_transactions WHERE reference=$1',[reference])).rows[0].status,'pending');
    assert.equal((await db.query('SELECT "paymentStatus" FROM orders WHERE id=$1',[order.id])).rows[0].paymentStatus,'unpaid');
  }finally{
    await db.query('DROP TRIGGER reject_release_audit ON production_job_activity');await db.query('DROP FUNCTION reject_release_audit()');
  }
  assert.equal((await webhook(reference)).status,201);
  assert.equal((await releaseState(order.id)).jobs.length,2);
});

test('database uniqueness prevents another job for the same order item',async()=>{
  const order=await releaseOrderFixture();assert.equal((await request(`/admin/orders/${order.id}/release`,supervisor,'POST')).status,201);
  const [job]=(await releaseState(order.id)).jobs;
  await assert.rejects(db.query('INSERT INTO production_jobs (id,"orderId","orderItemId","orderNumber","jobNumber","customerName","serviceCode",title,quantity) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)',[randomUUID(),order.id,job.orderItemId,order.number,order.number+'-OTHER','Customer','sav-sticker','Duplicate']),error=>error.code==='23505');
});

test('legacy partial release is reported as a conflict, without silently creating or replacing jobs',async()=>{
  const order=await releaseOrderFixture();assert.equal((await request(`/admin/orders/${order.id}/release`,supervisor,'POST')).status,201);
  const state=await releaseState(order.id);await db.query('DELETE FROM production_jobs WHERE id=$1',[state.jobs[1].id]);
  const before=await releaseState(order.id),result=await request(`/admin/orders/${order.id}/release`,supervisor,'POST');
  assert.equal(result.status,409);assert.match(result.data.message,/reconcile/);assert.deepEqual(await releaseState(order.id),before);
});

test('payment received for a cancelled order stays recorded without releasing production',async()=>{
  const order=await releaseOrderFixture({paymentStatus:'unpaid',status:'cancelled'}),reference=await paymentFixture(order);
  assert.equal((await webhook(reference)).status,201);
  const state=await releaseState(order.id);assert.equal(state.jobs.length,0);assert.equal(state.activity.length,0);assert.equal(state.outbox.length,1);
  const saved=(await db.query('SELECT status,"paymentStatus" FROM orders WHERE id=$1',[order.id])).rows[0];assert.deepEqual(saved,{status:'cancelled',paymentStatus:'paid'});
  assert.equal((await webhook(reference)).data.idempotent,true);assert.deepEqual(await releaseState(order.id),state);
});
