import { useEffect, useState, type FormEvent } from 'react';
import { api } from './api';

type Staff = {id:string; name:string; email:string; role:string; isActive:boolean; mustChangePassword:boolean};
const labels: Record<string,string> = {admin:'Administrator', operations_supervisor:'Operations supervisor', designer:'Designer', production_operator:'Production operator', quality_control:'Quality control', dispatch:'Dispatch'};
const descriptions: Record<string,string> = {
  operations_supervisor:'Release jobs, assign staff and due dates, manage all production stages, and add notes.',
  designer:'Review artwork, manage proofing stages, and add production notes.',
  production_operator:'Start production, send work to quality control, flag blockers, and add notes.',
  quality_control:'Pass quality checks, return work for rework, flag blockers, and add notes.',
  dispatch:'Complete ready jobs, return them for quality checks, flag blockers, and add notes.',
};
const message = (error:unknown) => error instanceof Error ? error.message : 'Request failed. Please try again.';

function StaffRow({person,roles,onUpdate}:{person:Staff;roles:string[];onUpdate:(person:Staff)=>void}) {
  const [role,setRole] = useState(person.role);
  const [active,setActive] = useState(person.isActive);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const changed = role !== person.role || active !== person.isActive;
  async function save() {
    setBusy(true); setError('');
    try { onUpdate(await api.updateStaff<Staff>(person.id,{role,isActive:active})); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <tr><td><strong>{person.name}</strong><small>{person.email}</small>{person.mustChangePassword&&<small>First sign-in password change required</small>}</td><td>{person.role==='admin'?labels.admin:<select aria-label={'Role for '+person.name} value={role} disabled={busy} onChange={e=>setRole(e.target.value)}>{roles.map(role=><option key={role} value={role}>{labels[role]||role}</option>)}</select>}</td><td>{person.role==='admin'?'Active':<label className="check-label"><input type="checkbox" checked={active} disabled={busy} onChange={e=>setActive(e.target.checked)}/>{active?'Active':'Inactive'}</label>}</td><td>{person.role!=='admin'&&<button className="button ghost" disabled={!changed||busy} onClick={save}>{busy?'Saving…':'Save access'}</button>}{error&&<p role="alert" className="alert">{error}</p>}</td></tr>;
}

export default function StaffManagement() {
  const [staff,setStaff] = useState<Staff[]>([]);
  const [roles,setRoles] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [success,setSuccess] = useState('');
  const [form,setForm] = useState({name:'',email:'',role:'production_operator',temporaryPassword:''});
  async function load() {
    setLoading(true); setError('');
    try { const data=await api.staff<{staff:Staff[];roles:string[]}>(); setStaff(data.staff); setRoles(data.roles); }
    catch (error) { setError(message(error)); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load()},[]);
  async function create(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const person=await api.createStaff<Staff>(form);
      setStaff(current=>[...current,person]);
      setForm({...form,name:'',email:'',temporaryPassword:''});
      setSuccess(`Account created for ${person.name}. Share the temporary password directly; they must replace it at first sign-in.`);
    } catch (error) {setError(message(error))}
    finally {setBusy(false)}
  }
  if(loading)return <section className="surface staff-access" role="status">Loading staff accounts…</section>;
  return <div className="view-enter staff-access-view">
    <section className="surface staff-access">
      <div className="section-title"><div><h2>Staff access</h2><p>Give each person the access their production work needs.</p></div><span className="category-chip">{staff.filter(person=>person.isActive).length} active accounts</span></div>
      <p>All operational roles can view the production board and job activity. Finance, pricing, catalogue, settings, and staff management are reserved for administrators.</p>
      <p>Saving a role or active-status change signs that person out. Administrator access cannot be changed here.</p>
      {success&&<p role="status" className="staff-success">{success}</p>}
      {error&&<div className="alert" role="alert">{error}<button className="button ghost" onClick={load}>Reload staff</button></div>}
      <div className="data-table"><table><thead><tr><th>Person</th><th>Role</th><th>Access</th><th>Action</th></tr></thead><tbody>{staff.map(person=><StaffRow key={person.id+person.role+person.isActive} person={person} roles={roles} onUpdate={updated=>{setStaff(current=>current.map(person=>person.id===updated.id?updated:person));setSuccess(`Access updated for ${updated.name}. Existing sessions have been revoked.`)}}/>)}</tbody></table></div>
      {!staff.length&&!error&&<p>No staff accounts yet.</p>}
    </section>
    <section className="surface staff-access">
      <div className="section-title"><div><h2>Add a staff member</h2><p>Use their work email and a temporary password.</p></div></div>
      <form onSubmit={create} className="staff-access-form">
        <div className="form-grid two"><label>Full name<input value={form.name} minLength={2} maxLength={120} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Email address<input type="email" value={form.email} maxLength={254} onChange={e=>setForm({...form,email:e.target.value})} required/></label></div>
        <div className="form-grid two"><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(role=><option key={role} value={role}>{labels[role]||role}</option>)}</select><small>{descriptions[form.role]}</small></label><label>Temporary password<input type="password" autoComplete="new-password" minLength={12} maxLength={72} value={form.temporaryPassword} onChange={e=>setForm({...form,temporaryPassword:e.target.value})} required/><small>12–72 characters, including uppercase, lowercase, a number, and a symbol. No invitation email is sent.</small></label></div>
        <button className="button primary" disabled={busy||!roles.length}>{busy?'Creating account…':'Create staff account'}</button>
      </form>
    </section>
  </div>;
}
