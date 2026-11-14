import {enqueueCommand,type QueuedCommand} from './offline/queue';
import {clearCachedUser,getDeviceId} from './offline/db';

export const API_URL=import.meta.env.VITE_API_URL||'http://localhost:3000/api';
let csrfToken=sessionStorage.getItem('admin-csrf')||'';
export type ApiUser={email:string;name:string;role:string;permissions:readonly string[];mustChangePassword:boolean};
export class ApiError extends Error{status:number;body?:object;constructor(status:number,message:string,body?:object){super(message);this.status=status;this.body=body}}
async function request<T>(path:string,options:RequestInit={}){const headers=new Headers(options.headers);if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');if(!['GET','HEAD'].includes(options.method||'GET')&&csrfToken)headers.set('X-CSRF-Token',csrfToken);const response=await fetch(`${API_URL}${path}`,{...options,headers,credentials:'include'});const payload=await response.json().catch(()=>({}));if(!response.ok){const message=Array.isArray(payload.message)?payload.message.join('. '):payload.message||payload.error||'Request failed';throw new ApiError(response.status,message,payload)}return payload as T}

// A fetch rejection (TypeError) means no network; an ApiError means the server answered.
export function isNetworkFailure(e:unknown):boolean{return e instanceof TypeError}
let actor='';
export function setSessionActor(email:string){actor=email}

// Where each queueable command is sent. `local` fields stay on the queued payload
// for matching and display but are not part of the request DTO.
type CommandRoute={method:'POST'|'PATCH';path:(p:Record<string,unknown>)=>string;local:string[]};
const COMMANDS:Record<string,CommandRoute>={
  'order.create':{method:'POST',path:()=>'/admin/orders',local:['deviceId']},
  'payment.record':{method:'POST',path:p=>`/admin/commerce/orders/${p.orderId}/payments`,local:['orderId','deviceId']},
  'refund.record':{method:'POST',path:p=>`/admin/commerce/orders/${p.orderId}/refunds`,local:['orderId','deviceId']},
  'order.release':{method:'POST',path:p=>`/admin/orders/${p.orderId}/release`,local:['orderId']},
  'productionJob.update':{method:'PATCH',path:p=>`/admin/orders/production/jobs/${p.jobId}`,local:['jobId']},
  'customer.create':{method:'POST',path:()=>'/admin/customers',local:[]},
  'customer.update':{method:'PATCH',path:p=>`/admin/customers/${p.customerId}`,local:['customerId']},
  'material.adjustStock':{method:'POST',path:p=>`/admin/materials/${p.materialId}/stock`,local:['materialId']},
  'material.recordCount':{method:'POST',path:p=>`/admin/materials/${p.materialId}/count`,local:['materialId']},
  'stock.adjust':{method:'POST',path:p=>`/admin/products/${p.productId}/stock`,local:['productId']},
};
export const commandTypes=Object.keys(COMMANDS);
export function wireBody(type:string,payload:Record<string,unknown>){const local=COMMANDS[type].local;return Object.fromEntries(Object.entries(payload).filter(([k,v])=>v!==undefined&&!local.includes(k)))}
// Sends straight to the server with no queue fallback; sync replay uses this.
export function sendCommand<T>(type:string,payload:Record<string,unknown>){const route=COMMANDS[type];return request<T>(route.path(payload),{method:route.method,body:JSON.stringify(wireBody(type,payload))})}
export type Queued={queued:true;command:QueuedCommand};
export function isQueued(result:unknown):result is Queued{return Boolean(result&&(result as Queued).queued===true)}
async function mutateOrQueue<T>(type:string,payload:Record<string,unknown>,idField:'requestKey'|'commandId'):Promise<T>{
  if(!payload[idField])payload[idField]=crypto.randomUUID();
  if(idField==='commandId'&&!payload.deviceId)payload.deviceId=await getDeviceId().catch(()=>undefined);
  try{return await sendCommand<T>(type,payload)}
  catch(e){
    if(!isNetworkFailure(e))throw e;
    if(!payload.deviceId)payload.deviceId=await getDeviceId();
    const command=await enqueueCommand(type,payload,payload.expectedVersion as number|undefined,actor||undefined);
    return {queued:true,command} as T;
  }
}
export const api={
  orderDetail:<T>(id:string)=>request<T>(`/admin/commerce/orders/${id}`),
  staffEstimate:<T>(data:unknown)=>request<T>('/admin/orders/estimate',{method:'POST',body:JSON.stringify(data)}),
  recordPayment:<T>(id:string,data:unknown)=>mutateOrQueue<T>('payment.record',{...(data as Record<string,unknown>),orderId:id},'requestKey'),
  recordRefund:<T>(id:string,data:unknown)=>mutateOrQueue<T>('refund.record',{...(data as Record<string,unknown>),orderId:id},'requestKey'),
  confirmQuote:<T>(id:string,data:unknown)=>request<T>(`/admin/commerce/orders/${id}/quote`,{method:'PATCH',body:JSON.stringify(data)}),
  policies:<T>()=>request<T>('/admin/commerce/policies'),
  savePolicies:<T>(data:unknown)=>request<T>('/admin/commerce/policies',{method:'PATCH',body:JSON.stringify(data)}),
  notifications:<T>()=>request<T>('/admin/commerce/notifications'),
  retryNotification:<T>(id:string)=>request<T>(`/admin/commerce/notifications/${id}/retry`,{method:'POST'}),
  emailQuote:<T>(id:string,data:unknown)=>request<T>(`/admin/commerce/quotes/${id}/email`,{method:'POST',body:JSON.stringify(data)}),
  emailReport:()=>request('/admin/analytics/email',{method:'POST'}),
  emailPayslip:(id:string)=>request(`/admin/people/payslips/${id}/email`,{method:'POST'}),
  correctAttendance:(id:string,data:unknown)=>request(`/admin/people/attendance/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  report:<T>(from:string,to:string)=>request<T>(`/admin/analytics?from=${from}&to=${to}`),
  async uploadArtwork(file:File){const body=new FormData();body.append('file',file);return request<{url:string;name?:string}>('/quotes/media',{method:'POST',body})},
  staff:<T>()=>request<T>('/admin/staff'),
  createStaff:<T>(data:unknown)=>request<T>('/admin/staff',{method:'POST',body:JSON.stringify(data)}),
  updateStaff:<T>(id:string,data:unknown)=>request<T>(`/admin/staff/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  productionIntake:<T>()=>request<T>('/admin/orders/production/intake'),
  async login(email:string,password:string){const result=await request<{csrfToken:string;user:ApiUser}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});csrfToken=result.csrfToken;sessionStorage.setItem('admin-csrf',csrfToken);actor=result.user.email;return result.user},
  async me(){const result=await request<{csrfToken:string;user:ApiUser}>('/auth/me');csrfToken=result.csrfToken;sessionStorage.setItem('admin-csrf',csrfToken);actor=result.user.email;return result.user},
  async logout(){try{await request('/auth/logout',{method:'POST'})}finally{csrfToken='';sessionStorage.removeItem('admin-csrf');actor='';await clearCachedUser().catch(()=>{})}},
  async changePassword(currentPassword:string,newPassword:string){await request('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});csrfToken='';sessionStorage.removeItem('admin-csrf')},
  products:<T>()=>request<T>('/admin/products'),createProduct:<T>(data:unknown)=>request<T>('/admin/products',{method:'POST',body:JSON.stringify(data)}),updateProduct:<T>(id:string,data:unknown)=>request<T>(`/admin/products/${id}`,{method:'PATCH',body:JSON.stringify(data)}),deleteProduct:(id:string)=>request(`/admin/products/${id}`,{method:'DELETE'}),
  materials:<T>()=>request<T>('/admin/materials'),createMaterial:<T>(data:unknown)=>request<T>('/admin/materials',{method:'POST',body:JSON.stringify(data)}),updateMaterial:<T>(id:string,data:unknown)=>request<T>(`/admin/materials/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  adjustMaterialStock:<T>(id:string,data:unknown)=>mutateOrQueue<T>('material.adjustStock',{...(data as Record<string,unknown>),materialId:id},'commandId'),
  recordMaterialCount:<T>(id:string,data:unknown)=>mutateOrQueue<T>('material.recordCount',{...(data as Record<string,unknown>),materialId:id},'commandId'),
  recordProductCount:<T>(id:string,data:unknown)=>request<T>(`/admin/products/${id}/count`,{method:'POST',body:JSON.stringify(data)}),flagMaterialShortfalls:<T>(from:string,to:string)=>request<T>(`/admin/materials/flags/shortfalls?from=${from}&to=${to}`),
  quotes:<T>()=>request<T>('/admin/quotes'),updateQuoteStatus:<T>(id:string,status:string)=>request<T>(`/admin/quotes/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  orders:<T>()=>request<T>('/admin/orders'),
  createOrder:<T>(data:unknown)=>mutateOrQueue<T>('order.create',{...(data as Record<string,unknown>)},'requestKey'),
  productionJobs:<T>()=>request<T>('/admin/orders/production/jobs'),productionJobActivity:<T>(id:string)=>request<T>(`/admin/orders/production/jobs/${id}/activity`),addProductionJobNote:<T>(id:string,note:string)=>request<T>(`/admin/orders/production/jobs/${id}/activity`,{method:'POST',body:JSON.stringify({note})}),logJobConsumption:<T>(jobId:string,data:unknown)=>request<T>(`/admin/orders/production/jobs/${jobId}/consumption`,{method:'POST',body:JSON.stringify(data)}),
  releaseOrder:<T>(id:string,overrideReason?:string,expectedVersion?:number)=>mutateOrQueue<T>('order.release',{orderId:id,overrideReason,expectedVersion},'commandId'),
  updateProductionJob:<T>(id:string,data:unknown)=>mutateOrQueue<T>('productionJob.update',{...(data as Record<string,unknown>),jobId:id},'commandId'),
  updateOrderStatus:<T>(id:string,status:string,note='',customerVisible=true)=>request<T>(`/admin/orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status,note,customerVisible})}),
  adjustStock:<T>(id:string,stock:number,reason:string,expectedVersion?:number)=>mutateOrQueue<T>('stock.adjust',{productId:id,stock,reason,expectedVersion},'commandId'),
  dashboard:<T>()=>request<T>('/admin/dashboard'),activity:<T>(entity?:string,entityId?:string)=>request<T>(`/admin/activity${entity?`?entity=${encodeURIComponent(entity)}${entityId?`&entityId=${encodeURIComponent(entityId)}`:''}`:''}`),stockActivity:<T>()=>request<T>('/admin/stock-activity'),insights:<T>()=>request<T>('/admin/insights'),settings:<T>()=>request<T>('/admin/settings'),updateSettings:<T>(data:unknown)=>request<T>('/admin/settings',{method:'PATCH',body:JSON.stringify(data)}),
  payments:<T>()=>request<T>('/admin/payments'),paymentSummary:<T>()=>request<T>('/admin/payments/summary'),
  pricingRules:<T>()=>request<T>('/admin/pricing/rules'),createPricingRule:<T>(data:unknown)=>request<T>('/admin/pricing/rules',{method:'POST',body:JSON.stringify(data)}),savePricingDraft:<T>(id:string,data:unknown)=>request<T>(`/admin/pricing/rules/${id}/draft`,{method:'PATCH',body:JSON.stringify(data)}),testPricingDraft:<T>(id:string,data:unknown)=>request<T>(`/admin/pricing/drafts/${id}/test`,{method:'POST',body:JSON.stringify(data)}),publishPricingDraft:<T>(id:string)=>request<T>(`/admin/pricing/drafts/${id}/publish`,{method:'POST'}),pricingHistory:<T>(id:string)=>request<T>(`/admin/pricing/rules/${id}/history`),updatePricingCopy:<T>(id:string,data:unknown)=>request<T>(`/admin/pricing/rules/${id}/copy`,{method:'PATCH',body:JSON.stringify(data)}),
  // People, payroll and attendance
  employees:<T>(includeInactive=false)=>request<T>(`/admin/people/employees${includeInactive?'?includeInactive=true':''}`),
  createEmployee:<T>(data:unknown)=>request<T>('/admin/people/employees',{method:'POST',body:JSON.stringify(data)}),
  updateEmployee:<T>(id:string,data:unknown)=>request<T>(`/admin/people/employees/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  attendance:<T>(params:{from?:string;to?:string;employeeId?:string}={})=>{const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v) as [string,string][]);return request<T>(`/admin/people/attendance${q.toString()?'?'+q:''}`)},
  flagCustomPriced:<T>(params:{from?:string;to?:string}={})=>{const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v) as [string,string][]);return request<T>(`/admin/orders/flags/custom-priced${q.toString()?'?'+q:''}`)},
  flagLateCancellations:<T>(params:{from?:string;to?:string}={})=>{const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v) as [string,string][]);return request<T>(`/admin/orders/flags/late-cancellations${q.toString()?'?'+q:''}`)},
  flagUnattendedJobs:<T>(date:string)=>request<T>(`/admin/orders/flags/unattended-jobs?date=${date}`),
  materialReconciliation:<T>(from:string,to:string)=>request<T>(`/admin/materials/reconciliation?from=${from}&to=${to}`),
  clockIn:<T>(employeeId:string,note='')=>request<T>('/admin/people/attendance/clock-in',{method:'POST',body:JSON.stringify({employeeId,note})}),
  clockOut:<T>(employeeId:string)=>request<T>('/admin/people/attendance/clock-out',{method:'POST',body:JSON.stringify({employeeId})}),
  recordAttendance:<T>(data:unknown)=>request<T>('/admin/people/attendance',{method:'POST',body:JSON.stringify(data)}),
  payrollRuns:<T>()=>request<T>('/admin/people/payroll'),
  payrollRun:<T>(id:string)=>request<T>(`/admin/people/payroll/${id}`),
  createPayrollRun:<T>(data:unknown)=>request<T>('/admin/people/payroll',{method:'POST',body:JSON.stringify(data)}),
  updatePayrollStatus:<T>(id:string,status:string)=>request<T>(`/admin/people/payroll/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  updatePayslip:<T>(id:string,data:unknown)=>request<T>(`/admin/people/payslips/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  performance:<T>(params:{from?:string;to?:string}={})=>{const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v) as [string,string][]);return request<T>(`/admin/people/performance${q.toString()?'?'+q:''}`)},
  // Analytics and customers
  analytics:<T>(days=30,from?:string,to?:string)=>request<T>(`/admin/analytics?days=${days}${from?`&from=${from}`:''}${to?`&to=${to}`:''}`),
  analyticsInsights:<T>()=>request<T>('/admin/analytics/insights'),
  reconcilePayments:<T>()=>request<T>('/admin/analytics/reconcile',{method:'POST'}),
  customers:<T>(q='')=>request<T>(`/admin/customers${q?`?q=${encodeURIComponent(q)}`:''}`),
  customer:<T>(id:string)=>request<T>(`/admin/customers/${id}`),
  createCustomer:<T>(data:unknown)=>mutateOrQueue<T>('customer.create',{...(data as Record<string,unknown>)},'commandId'),
  updateCustomer:<T>(id:string,data:unknown)=>mutateOrQueue<T>('customer.update',{...(data as Record<string,unknown>),customerId:id},'commandId'),
  refundOrder:<T>(id:string,amountPesewas:number,reason:string)=>request<T>(`/admin/orders/${id}/refund`,{method:'POST',body:JSON.stringify({amountPesewas,reason})}),
  // Password recovery
  forgotPassword:<T>(email:string)=>request<T>('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}),
  resetPassword:<T>(token:string,newPassword:string)=>request<T>('/auth/reset-password',{method:'POST',body:JSON.stringify({token,newPassword})}),
  async upload(file:File){const body=new FormData();body.append('file',file);return request<{url:string}>('/admin/media',{method:'POST',body})}
};
