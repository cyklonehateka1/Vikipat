import { useEffect, useState } from 'react';
import { Calculator, Check, ChevronRight, FlaskConical, History, Plus, Ruler, Save, Trash2 } from 'lucide-react';
import { api } from './api';

export type PricingDraft={id:string;baseVersion:number;employeeRatePesewas:number;marketerRatePesewas:number;walkInRatePesewas:number;onlineRatePesewas:number;designMinimumPesewas:number;roundingMode:'nearest_cedi'|'up_to_cedi';changeNote:string;updatedAt:string};
export type MaterialSize={label:string;width:number;height:number;unit:'ft'|'in'};
export type PricingRule={id:string;code:string;name:string;material:string;version:number;allowCustomSize:boolean;fixedSizes:MaterialSize[];employeeRatePesewas:number;marketerRatePesewas:number;walkInRatePesewas:number;onlineRatePesewas:number;designMinimumPesewas:number;roundingMode:'nearest_cedi'|'up_to_cedi';active:boolean;updatedAt:string;draft:PricingDraft|null};
type PricingResult={disposition:string;totalAreaSqFt:number;basePesewas:number;totalPesewas:number;ratePesewasPerSqFt:number};
type Props={rules:PricingRule[];onReload:()=>Promise<void>;notify:(text:string)=>void};

const errorText=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.';
const cedis=(pesewas:number)=>String((pesewas/100).toFixed(2));
const pesewas=(value:string)=>Math.round(Number(value||0)*100);
/** A print job's price is whole cedis. */
const whole=(pesewas:number)=>Math.round(pesewas/100).toLocaleString('en-GH');
const when=(value:string)=>new Intl.DateTimeFormat('en-GH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

export default function PricingStudio({rules,onReload,notify}:Props){
  const[selectedId,setSelectedId]=useState(rules[0]?.id||'');
  const selected=rules.find(rule=>rule.id===selectedId)||rules[0];
  const[form,setForm]=useState({employee:'',marketer:'',walkIn:'',online:'',designMinimum:'100.00',roundingMode:'nearest_cedi' as PricingRule['roundingMode'],changeNote:''});
  const[test,setTest]=useState({width:'3',height:'3',unit:'ft',quantity:'1',priceBook:'online',needsDesign:false});
  const[result,setResult]=useState<PricingResult|null>(null);
  const[busy,setBusy]=useState<'save'|'test'|'publish'|'sizes'|''>('');
  type SizeRow={label:string;width:string;height:string;unit:'ft'|'in'};
  const[sizes,setSizes]=useState<{allowCustomSize:boolean;rows:SizeRow[]}>({allowCustomSize:true,rows:[]});
  const[error,setError]=useState('');

  useEffect(()=>{
    if(!selected)return;
    const source=selected.draft||selected;
    setForm({employee:cedis(source.employeeRatePesewas),marketer:cedis(source.marketerRatePesewas),walkIn:cedis(source.walkInRatePesewas),online:cedis(source.onlineRatePesewas),designMinimum:cedis(source.designMinimumPesewas),roundingMode:source.roundingMode,changeNote:selected.draft?.changeNote||''});
    setResult(null);setError('');
  },[selected?.id,selected?.draft?.updatedAt]);

  useEffect(()=>{
    if(!selected)return;
    setSizes({allowCustomSize:selected.allowCustomSize!==false,rows:(selected.fixedSizes||[]).map(size=>({label:size.label,width:String(size.width),height:String(size.height),unit:size.unit}))});
  },[selected?.id,selected?.updatedAt]);

  if(!selected)return <section className="surface pricing-empty"><Calculator/><h2>No pricing rules</h2><p>Published service rates will appear here.</p></section>;
  const payload=()=>({employeeRatePesewas:pesewas(form.employee),marketerRatePesewas:pesewas(form.marketer),walkInRatePesewas:pesewas(form.walkIn),onlineRatePesewas:pesewas(form.online),designMinimumPesewas:pesewas(form.designMinimum),roundingMode:form.roundingMode,changeNote:form.changeNote});
  async function save(){setBusy('save');setError('');try{await api.savePricingDraft(selected.id,payload());await onReload();notify('Pricing draft saved')}catch(e){setError(errorText(e))}finally{setBusy('')}}
  async function runTest(){setBusy('test');setError('');try{const draft=await api.savePricingDraft<PricingDraft>(selected.id,payload());await onReload();setResult(await api.testPricingDraft<PricingResult>(draft.id,{width:Number(test.width),height:Number(test.height),unit:test.unit,quantity:Number(test.quantity),priceBook:test.priceBook,needsDesign:test.needsDesign}))}catch(e){setError(errorText(e))}finally{setBusy('')}}
  const sizeRowsValid=sizes.rows.every(row=>row.label.trim()&&Number(row.width)>=0.1&&Number(row.height)>=0.1);
  const sizesValid=sizeRowsValid&&(sizes.allowCustomSize||sizes.rows.length>0);
  const updateRow=(index:number,patch:Partial<SizeRow>)=>setSizes({...sizes,rows:sizes.rows.map((row,i)=>i===index?{...row,...patch}:row)});
  async function saveSizes(){setBusy('sizes');setError('');try{await api.updatePricingCopy(selected.id,{allowCustomSize:sizes.allowCustomSize,fixedSizes:sizes.rows.map(row=>({label:row.label.trim(),width:Number(row.width),height:Number(row.height),unit:row.unit}))});await onReload();notify('Customer sizes saved')}catch(e){setError(errorText(e))}finally{setBusy('')}}
  async function publish(){if(!selected.draft)return;setBusy('publish');setError('');try{await api.publishPricingDraft(selected.draft.id);await onReload();notify('New pricing version published')}catch(e){setError(errorText(e))}finally{setBusy('')}}

  return <section className="pricing-studio view-enter">
    <aside className="pricing-index surface"><div className="section-title"><div><h2>Large format</h2><p>{rules.length} published materials</p></div></div><div className="pricing-rule-list">{rules.map(rule=><button type="button" key={rule.id} className={selected.id===rule.id?'active':''} onClick={()=>setSelectedId(rule.id)}><span><strong>{rule.name}</strong><small>Version {rule.version} · GH₵ {cedis(rule.onlineRatePesewas)}/ft²{rule.allowCustomSize===false?' · Set sizes':''}</small></span>{rule.draft&&<b>Draft</b>}<ChevronRight/></button>)}</div></aside>
    <div className="pricing-editor surface"><header className="pricing-editor-head"><div><span className="status active"><i/>Published version {selected.version}</span><h2>{selected.name}</h2><p>Changes remain private until you test and publish the draft.</p></div><div className="pricing-version"><History/><span>Updated<strong>{when(selected.updatedAt)}</strong></span></div></header>{error&&<div className="alert" role="alert">{error}</div>}
      <div className="pricing-rate-grid">{([['employee','Employee'],['marketer','Marketer'],['walkIn','Walk-in'],['online','Online']] as const).map(([key,label])=><label key={key}>{label} rate <span>GH₵ per ft²</span><input type="number" min="0" step="0.01" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div>
      <div className="pricing-policy"><label>Design minimum <span>Starts from GH₵100 and requires review</span><input type="number" min="100" step="0.01" value={form.designMinimum} onChange={e=>setForm({...form,designMinimum:e.target.value})}/></label><label>Rounding policy <span>Every job total is a whole number of cedis</span><select value={form.roundingMode} onChange={e=>setForm({...form,roundingMode:e.target.value as PricingRule['roundingMode']})}><option value="nearest_cedi">Nearest cedi</option><option value="up_to_cedi">Always round up</option></select></label></div>
      <label className="pricing-note">Reason for change <span>Required for the audit trail</span><textarea value={form.changeNote} maxLength={300} onChange={e=>setForm({...form,changeNote:e.target.value})} placeholder="Example: Approved September online rate update"/></label>
      <div className="pricing-actions"><button type="button" className="button ghost" disabled={busy!==''||form.changeNote.trim().length<3} onClick={save}><Save/>{busy==='save'?'Saving…':'Save draft'}</button><button type="button" className="button primary" disabled={busy!==''||!selected.draft} onClick={publish}><Check/>{busy==='publish'?'Publishing…':'Publish current draft'}</button></div>
      <section className="pricing-sizes">
        <div className="sandbox-heading"><Ruler/><span><strong>Customer sizes</strong><small>Turn off custom sizes for stock that only comes in set sizes. Customers then pick from the list below. This applies as soon as you save.</small></span></div>
        <label className="sandbox-check"><input type="checkbox" checked={sizes.allowCustomSize} onChange={e=>setSizes({...sizes,allowCustomSize:e.target.checked})}/>Customers can enter a custom size</label>
        {!sizes.allowCustomSize&&<>
          <div className="pricing-size-rows">{sizes.rows.map((row,index)=><div className="pricing-size-row" key={index}>
            <label>Name<input value={row.label} maxLength={40} placeholder="A3" onChange={e=>updateRow(index,{label:e.target.value})}/></label>
            <label>Width<input type="number" min="0.1" step="0.1" value={row.width} onChange={e=>updateRow(index,{width:e.target.value})}/></label>
            <label>Height<input type="number" min="0.1" step="0.1" value={row.height} onChange={e=>updateRow(index,{height:e.target.value})}/></label>
            <label>Unit<select value={row.unit} onChange={e=>updateRow(index,{unit:e.target.value as 'ft'|'in'})}><option value="in">Inches</option><option value="ft">Feet</option></select></label>
            <button type="button" className="button ghost" aria-label={`Remove ${row.label||'size'}`} onClick={()=>setSizes({...sizes,rows:sizes.rows.filter((_,i)=>i!==index)})}><Trash2/></button>
          </div>)}</div>
          {sizes.rows.length<20&&<button type="button" className="button ghost" onClick={()=>setSizes({...sizes,rows:[...sizes.rows,{label:'',width:'',height:'',unit:'in'}]})}><Plus/>Add a size</button>}
          {!sizes.rows.length&&<p className="pricing-size-hint">Add at least one size.</p>}
        </>}
        <div className="pricing-actions"><button type="button" className="button primary" disabled={busy!==''||!sizesValid} onClick={saveSizes}><Save/>{busy==='sizes'?'Saving…':'Save sizes'}</button></div>
      </section>
      <section className="pricing-sandbox"><div className="sandbox-heading"><FlaskConical/><span><strong>Calculation sandbox</strong><small>Test the draft before it reaches customers.</small></span></div><div className="sandbox-fields"><label>Width<input type="number" min="0.1" value={test.width} onChange={e=>setTest({...test,width:e.target.value})}/></label><label>Height<input type="number" min="0.1" value={test.height} onChange={e=>setTest({...test,height:e.target.value})}/></label><label>Unit<select value={test.unit} onChange={e=>setTest({...test,unit:e.target.value})}><option value="ft">Feet</option><option value="in">Inches</option></select></label><label>Quantity<input type="number" min="1" step="1" value={test.quantity} onChange={e=>setTest({...test,quantity:e.target.value})}/></label><label>Price book<select value={test.priceBook} onChange={e=>setTest({...test,priceBook:e.target.value})}><option value="online">Online</option><option value="walk_in">Walk-in</option><option value="marketer">Marketer</option><option value="employee">Employee</option></select></label><label className="sandbox-check"><input type="checkbox" checked={test.needsDesign} onChange={e=>setTest({...test,needsDesign:e.target.checked})}/>Needs design</label><button type="button" className="button ghost" disabled={busy!==''||form.changeNote.trim().length<3} onClick={runTest}><FlaskConical/>{busy==='test'?'Calculating…':'Run test'}</button></div>{result&&<div className="sandbox-result" aria-live="polite"><span><small>Area</small><strong>{result.totalAreaSqFt} ft²</strong></span><span><small>Applied rate</small><strong>GH₵ {cedis(result.ratePesewasPerSqFt)}</strong></span><span><small>Print</small><strong>GH₵ {whole(result.basePesewas)}</strong></span><span><small>Total estimate</small><strong>GH₵ {whole(result.totalPesewas)}</strong></span><b>{result.disposition}</b></div>}</section>
    </div>
  </section>;
}
