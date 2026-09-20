const {test,after}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {ValidationPipe}=require('@nestjs/common');
const {CreateOnlineOrderDto,CreateGuestOrderDto}=require('../dist/dto');
const {OrderService}=require('../dist/order.service');
const {PaymentService}=require('../dist/payment.service');
const pipe=new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}});
const body={customerName:'Checkout Tester',customerEmail:'checkout@example.test',source:'online',items:[{type:'large_format',serviceCode:'flexy-banner',width:3,height:3,unit:'ft',quantity:1}]};
const validate=(payload,metatype=CreateOnlineOrderDto)=>pipe.transform(payload,{type:'body',metatype});
const envNames=['STOREFRONT_URL','PAYSTACK_CALLBACK_URL','API_PUBLIC_URL','NODE_ENV','PAYSTACK_SECRET_KEY'];
const original=Object.fromEntries(envNames.map(k=>[k,process.env[k]]));
after(()=>{for(const name of envNames){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}});

for(const method of [undefined,null,'','card','momo','Mobile Money','MOBILE_MONEY',' mobile_money','mobile_money ',['mobile_money'],{method:'mobile_money'},true,1]){
  test(`online DTO rejects non-exact payment selection ${JSON.stringify(method)}`,async()=>{
    await assert.rejects(validate({...body,paymentMethod:method}),e=>e.getStatus()===400);
  });
}
test('online DTO accepts explicit mobile_money and preserves it',async()=>{
  const dto=await validate({...body,paymentMethod:'mobile_money'});assert.equal(dto.paymentMethod,'mobile_money');
});
test('spoofing a staff source does not bypass public payment validation',async()=>{
  await assert.rejects(validate({...body,source:'walk_in'}),e=>e.getStatus()===400);
});
test('staff DTO still accepts orders without an online payment choice',async()=>{
  const dto=await validate({...body,source:'walk_in'},CreateGuestOrderDto);assert.equal(dto.source,'walk_in');
});
test('service rejects missing/invalid choice before any order or stock writes',async()=>{
  const service=Object.create(OrderService.prototype);
  for(const method of [undefined,'card','mobile_money '])await assert.rejects(service.createGuest({...body,paymentMethod:method},'online'),/paymentMethod must be exactly mobile_money/);
});

const order={id:'order-1',orderNumber:'VP-TEST1234',customerEmail:'checkout+test@example.test',customerName:'Checkout Tester',totalPesewas:2300,requiresReview:false};
function resetUrls(){process.env.STOREFRONT_URL='http://localhost:5173';delete process.env.PAYSTACK_CALLBACK_URL;process.env.API_PUBLIC_URL='http://localhost:3000';process.env.NODE_ENV='development';}
test('local callback targets customer confirmation and preserves identifying parameters',()=>{
  resetUrls();const service=new PaymentService({},{});const url=new URL(service.callbackUrl(order,'payment-reference'));
  assert.equal(url.origin,'http://localhost:5173');assert.equal(url.pathname,'/confirmation');assert.equal(url.searchParams.get('orderNumber'),order.orderNumber);assert.equal(url.searchParams.get('email'),order.customerEmail);assert.equal(url.searchParams.get('payment'),'payment-reference');
});
test('configured storefront origin is used independently of the API',()=>{
  resetUrls();process.env.STOREFRONT_URL='https://shop.example.test/';const url=new URL(new PaymentService({},{}).callbackUrl(order,'ref'));assert.equal(url.origin,'https://shop.example.test');assert.equal(url.pathname,'/confirmation');
});
test('missing frontend environment is rejected without falling back to the API or production domain',()=>{
  resetUrls();delete process.env.STOREFRONT_URL;process.env.NODE_ENV='production';assert.throws(()=>new PaymentService({},{}).callbackUrl(order,'ref'),/STOREFRONT_URL must be configured/);
});
test('legacy callback cannot override the configured frontend base',()=>{
  resetUrls();process.env.PAYSTACK_CALLBACK_URL='http://localhost:3000/confirmation';const url=new URL(new PaymentService({},{}).callbackUrl(order,'ref'));assert.equal(url.origin,'http://localhost:5173');
});
test('invalid frontend base URLs are rejected',()=>{
  for(const value of ['localhost:5173','javascript:alert(1)','https://user:pass@example.test','not-a-url']){
    resetUrls();process.env.STOREFRONT_URL=value;assert.throws(()=>new PaymentService({},{}).callbackUrl(order,'ref'),/valid HTTP\(S\)/);
  }
});
test('Paystack initialization sends only Mobile Money and the customer return URL',async(t)=>{
  resetUrls();process.env.PAYSTACK_SECRET_KEY='test-only-placeholder';let request,saved;
  t.mock.method(global,'fetch',async(url,options)=>{assert.equal(url,'https://api.paystack.co/transaction/initialize');request=JSON.parse(options.body);return {ok:true,json:async()=>({status:true,data:{authorization_url:'https://checkout.paystack.com/test-session',access_code:'test-access'}})};});
  const repo={create:value=>value,save:async value=>{saved=value;return value;}};
  const result=await new PaymentService(repo,{}).initializePaystack(order);
  assert.deepEqual(request.channels,['mobile_money']);assert.equal(request.metadata.paymentMethod,'mobile_money');assert.equal(new URL(request.callback_url).origin,'http://localhost:5173');assert.equal(request.amount,2300);assert.equal(saved.reference,result.reference);assert.equal(result.authorizationUrl,'https://checkout.paystack.com/test-session');
});
