import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, LogIn, LogOut, Plus, RefreshCw, Users, Wallet } from 'lucide-react';
import { api, ApiError } from './api';

export type Employee = {
  id: string; staffNumber: string; fullName: string; email: string; phone: string; jobTitle: string;
  department: string; employmentStatus: 'active' | 'suspended' | 'terminated';
  payType: 'monthly' | 'daily' | 'hourly'; payRatePesewas: number;
  bankName: string; bankAccount: string; momoNumber: string; ssnitNumber: string; hiredOn: string;
  onShift: boolean;
};
type Attendance = {
  id: string; employeeId: string; employeeName: string; workDate: string; clockIn: string; clockOut: string | null;
  minutesWorked: number; overtimeMinutes: number; status: string; note: string;
};
type PayrollRun = {
  id: string; reference: string; periodStart: string; periodEnd: string;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  grossPesewas: number; deductionsPesewas: number; netPesewas: number; payslipCount: number;
  approvedBy: string; paidAt: string | null;
};
type Payslip = {
  id: string; employeeName: string; staffNumber: string; payType: string; payRatePesewas: number;
  daysWorked: number; minutesWorked: number; overtimeMinutes: number;
  basePesewas: number; overtimePesewas: number; bonusPesewas: number; deductionsPesewas: number; netPesewas: number;
};
type Performance = {
  employeeId: string; name: string; jobTitle: string; department: string;
  daysPresent: number; lateDays: number; hoursWorked: number; jobsTouched: number; stageMoves: number; movesPerDay: number;
};

const money = (pesewas: number) => 'GH₵ ' + (pesewas / 100).toFixed(2);
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + '01';
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

const PAY_LABEL: Record<string, string> = { monthly: 'Monthly salary', daily: 'Daily rate', hourly: 'Hourly rate' };

function EmployeeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const blank = { fullName: '', email: '', phone: '', jobTitle: '', department: 'production', payType: 'monthly', payRate: '', momoNumber: '', bankName: '', bankAccount: '', ssnitNumber: '' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createEmployee({
        fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(),
        jobTitle: form.jobTitle.trim(), department: form.department, payType: form.payType,
        payRatePesewas: Math.round(Number(form.payRate || 0) * 100),
        momoNumber: form.momoNumber.trim(), bankName: form.bankName.trim(),
        bankAccount: form.bankAccount.trim(), ssnitNumber: form.ssnitNumber.trim(),
      });
      onDone();
    } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }

  return (
    <form className="staff-order-form" onSubmit={submit}>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="form-grid three">
        <label>Full name<input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required autoFocus /></label>
        <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Links their admin login" /></label>
        <label>Phone<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="024 411 1222" /></label>
      </div>
      <div className="form-grid three">
        <label>Job title<input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="Press Operator" /></label>
        <label>Department<select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
          {['production', 'design', 'sales', 'dispatch', 'admin', 'finance'].map(d => <option key={d} value={d}>{d}</option>)}
        </select></label>
        <label>Pay type<select value={form.payType} onChange={e => setForm({ ...form, payType: e.target.value })}>
          {Object.entries(PAY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
      </div>
      <div className="form-grid three">
        <label>{form.payType === 'monthly' ? 'Monthly salary (GH₵)' : form.payType === 'daily' ? 'Daily rate (GH₵)' : 'Hourly rate (GH₵)'}
          <input type="number" min="0" step="0.01" value={form.payRate} onChange={e => setForm({ ...form, payRate: e.target.value })} required /></label>
        <label>MoMo number<input value={form.momoNumber} onChange={e => setForm({ ...form, momoNumber: e.target.value })} /></label>
        <label>SSNIT number<input value={form.ssnitNumber} onChange={e => setForm({ ...form, ssnitNumber: e.target.value })} /></label>
      </div>
      <div className="form-grid two">
        <label>Bank<input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></label>
        <label>Account number<input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Add employee'}</button>
        <button type="button" className="button ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function People({ notify }: { notify: (t: string) => void }) {
  const [tab, setTab] = useState<'team' | 'attendance' | 'payroll' | 'performance'>('team');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [openRun, setOpenRun] = useState<(PayrollRun & { payslips: Payslip[] }) | null>(null);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState({ start: monthStart(), end: today() });

  async function load() {
    setLoading(true); setError('');
    try {
      const [emp, att, pay, perf] = await Promise.all([
        api.employees<Employee[]>(), api.attendance<Attendance[]>(),
        api.payrollRuns<PayrollRun[]>(), api.performance<Performance[]>(),
      ]);
      setEmployees(emp); setAttendance(att); setRuns(pay); setPerformance(perf);
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const onShift = useMemo(() => employees.filter(e => e.onShift), [employees]);
  const monthlyWage = useMemo(
    () => employees.filter(e => e.employmentStatus === 'active' && e.payType === 'monthly').reduce((s, e) => s + e.payRatePesewas, 0),
    [employees],
  );

  async function act(fn: () => Promise<unknown>, message: string) {
    try { await fn(); await load(); notify(message); }
    catch (e) { setError(e instanceof ApiError ? e.message : errText(e)); }
  }

  if (loading) return <div className="loading"><RefreshCw className="spin" /><strong>Loading people</strong></div>;

  return (
    <div className="view-enter">
      {error && <div className="alert" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="stat-row" style={{ marginBottom: 20 }}>
        <div className="surface stat"><span><Users /> Active staff</span><strong>{employees.filter(e => e.employmentStatus === 'active').length}</strong></div>
        <div className="surface stat"><span><Clock /> On shift now</span><strong>{onShift.length}</strong></div>
        <div className="surface stat"><span><Wallet /> Monthly salary bill</span><strong>{money(monthlyWage)}</strong></div>
        <div className="surface stat"><span><CalendarClock /> Pay runs</span><strong>{runs.length}</strong></div>
      </section>

      <div className="tab-row" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['team', 'attendance', 'payroll', 'performance'] as const).map(t => (
          <button key={t} className={tab === t ? 'button primary' : 'button ghost'} onClick={() => setTab(t)}>
            {t === 'team' ? 'Team' : t === 'attendance' ? 'Attendance' : t === 'payroll' ? 'Payroll' : 'Performance'}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <section className="surface">
          <div className="section-title">
            <div><h2>Team</h2><p>Everyone on the payroll, and who is on shift right now</p></div>
            <button className="button primary" onClick={() => setAdding(!adding)}><Plus />{adding ? 'Close' : 'Add employee'}</button>
          </div>
          {adding && <EmployeeForm onDone={() => { setAdding(false); load(); notify('Employee added'); }} onCancel={() => setAdding(false)} />}
          {employees.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Staff</th><th>Role</th><th>Pay</th><th>Shift</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{employees.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.fullName}</strong><small>{e.staffNumber}{e.email ? ` · ${e.email}` : ''}</small></td>
                  <td>{e.jobTitle || '—'}<small>{e.department}</small></td>
                  <td className="number">{money(e.payRatePesewas)}<small>{PAY_LABEL[e.payType]}</small></td>
                  <td>{e.onShift ? <span className="status active"><i />On shift</span> : <span className="status draft"><i />Off</span>}</td>
                  <td><span className={e.employmentStatus === 'active' ? 'status active' : 'status draft'}><i />{e.employmentStatus}</span></td>
                  <td>
                    {e.employmentStatus === 'active' && (e.onShift
                      ? <button className="button ghost" onClick={() => act(() => api.clockOut(e.id), `${e.fullName} clocked out`)}><LogOut />Clock out</button>
                      : <button className="button ghost" onClick={() => act(() => api.clockIn(e.id), `${e.fullName} clocked in`)}><LogIn />Clock in</button>)}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No employees yet. Add the first one above.</p>}
        </section>
      )}

      {tab === 'attendance' && (
        <section className="surface">
          <div className="section-title"><div><h2>Attendance</h2><p>Last 30 days. Hourly and daily pay is calculated from these records.</p></div></div>
          {attendance.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Date</th><th>Employee</th><th>In</th><th>Out</th><th>Worked</th><th>Overtime</th><th>Status</th></tr></thead>
              <tbody>{attendance.map(r => (
                <tr key={r.id}>
                  <td>{r.workDate}</td>
                  <td><strong>{r.employeeName}</strong></td>
                  <td>{new Date(r.clockIn).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }) : <em>still on shift</em>}</td>
                  <td className="number">{hours(r.minutesWorked)}</td>
                  <td className="number">{r.overtimeMinutes ? hours(r.overtimeMinutes) : '—'}</td>
                  <td><span className={r.status === 'late' ? 'status draft' : 'status active'}><i />{r.status}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No attendance recorded in this period.</p>}
        </section>
      )}

      {tab === 'payroll' && (
        <>
          <section className="surface" style={{ marginBottom: 16 }}>
            <div className="section-title"><div><h2>Run payroll</h2><p>Monthly staff are paid their salary; daily and hourly staff are paid from attendance.</p></div></div>
            <div className="form-grid three" style={{ alignItems: 'end' }}>
              <label>Period start<input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} /></label>
              <label>Period end<input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} /></label>
              <button className="button primary" onClick={() => act(() => api.createPayrollRun({ periodStart: period.start, periodEnd: period.end }), 'Draft pay run created')}>
                <Wallet />Generate draft
              </button>
            </div>
          </section>

          <section className="surface">
            <div className="section-title"><div><h2>Pay runs</h2><p>Draft, approve, then mark paid once the money has actually gone out</p></div></div>
            {runs.length ? (
              <div className="data-table"><table>
                <thead><tr><th>Reference</th><th>Period</th><th>Staff</th><th>Gross</th><th>Net</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{runs.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.reference}</strong></td>
                    <td>{r.periodStart} → {r.periodEnd}</td>
                    <td className="number">{r.payslipCount}</td>
                    <td className="number">{money(r.grossPesewas)}</td>
                    <td className="number"><strong>{money(r.netPesewas)}</strong></td>
                    <td><span className={r.status === 'paid' ? 'status active' : 'status draft'}><i />{r.status}</span></td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="button ghost" onClick={async () => setOpenRun(await api.payrollRun(r.id))}>Payslips</button>
                      {r.status === 'draft' && <button className="button ghost" onClick={() => act(() => api.updatePayrollStatus(r.id, 'approved'), 'Pay run approved')}>Approve</button>}
                      {r.status === 'approved' && <button className="button primary" onClick={() => act(() => api.updatePayrollStatus(r.id, 'paid'), 'Pay run marked paid')}><CheckCircle2 />Mark paid</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="muted" style={{ padding: 20 }}>No pay runs yet.</p>}
          </section>

          {openRun && (
            <section className="surface" style={{ marginTop: 16 }}>
              <div className="section-title">
                <div><h2>{openRun.reference}</h2><p>{openRun.periodStart} → {openRun.periodEnd} · {openRun.status}</p></div>
                <button className="button ghost" onClick={() => setOpenRun(null)}>Close</button>
              </div>
              <div className="data-table"><table>
                <thead><tr><th>Employee</th><th>Basis</th><th>Days</th><th>Worked</th><th>OT</th><th>Base</th><th>Overtime</th><th>Bonus</th><th>Deduction</th><th>Net</th></tr></thead>
                <tbody>{openRun.payslips.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.employeeName}</strong><small>{s.staffNumber}</small></td>
                    <td>{PAY_LABEL[s.payType]}<small>{money(s.payRatePesewas)}</small></td>
                    <td className="number">{s.daysWorked}</td>
                    <td className="number">{hours(s.minutesWorked)}</td>
                    <td className="number">{s.overtimeMinutes ? hours(s.overtimeMinutes) : '—'}</td>
                    <td className="number">{money(s.basePesewas)}</td>
                    <td className="number">{money(s.overtimePesewas)}</td>
                    <td className="number">
                      {openRun.status === 'draft'
                        ? <input type="number" min="0" step="0.01" defaultValue={(s.bonusPesewas / 100).toFixed(2)} style={{ width: 90 }}
                            onBlur={async e => { const v = Math.round(Number(e.target.value || 0) * 100); if (v !== s.bonusPesewas) { await api.updatePayslip(s.id, { bonusPesewas: v }); setOpenRun(await api.payrollRun(openRun.id)); await load(); } }} />
                        : money(s.bonusPesewas)}
                    </td>
                    <td className="number">
                      {openRun.status === 'draft'
                        ? <input type="number" min="0" step="0.01" defaultValue={(s.deductionsPesewas / 100).toFixed(2)} style={{ width: 90 }}
                            onBlur={async e => { const v = Math.round(Number(e.target.value || 0) * 100); if (v !== s.deductionsPesewas) { await api.updatePayslip(s.id, { deductionsPesewas: v }); setOpenRun(await api.payrollRun(openRun.id)); await load(); } }} />
                        : money(s.deductionsPesewas)}
                    </td>
                    <td className="number"><strong>{money(s.netPesewas)}</strong></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </section>
          )}
        </>
      )}

      {tab === 'performance' && (
        <section className="surface">
          <div className="section-title"><div><h2>Performance</h2><p>Attendance against production work actually moved, last 30 days</p></div></div>
          {performance.length ? (
            <div className="data-table"><table>
              <thead><tr><th>Employee</th><th>Days present</th><th>Late</th><th>Hours</th><th>Jobs touched</th><th>Stage moves</th><th>Moves/day</th></tr></thead>
              <tbody>{performance.map(p => (
                <tr key={p.employeeId}>
                  <td><strong>{p.name}</strong><small>{p.jobTitle || p.department}</small></td>
                  <td className="number">{p.daysPresent}</td>
                  <td className="number">{p.lateDays || '—'}</td>
                  <td className="number">{p.hoursWorked}</td>
                  <td className="number">{p.jobsTouched}</td>
                  <td className="number">{p.stageMoves}</td>
                  <td className="number">{p.movesPerDay}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ padding: 20 }}>No activity recorded yet.</p>}
          <p className="muted" style={{ padding: '12px 20px', fontSize: '0.8rem' }}>
            Stage moves count production steps completed by the account matching each employee's email. Treat it as a workload signal, not a score.
          </p>
        </section>
      )}
    </div>
  );
}
