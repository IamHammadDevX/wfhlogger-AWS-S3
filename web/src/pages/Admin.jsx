import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import { getSocket } from '../socket.js'
import { TextField, CountrySelect, TimezoneSelect } from '../components/FormControls.jsx'
import { Tabs } from '../components/admin/Tabs.jsx'
import { AuditDetailsDrawer } from '../components/admin/AuditDetailsDrawer.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import { usePagination } from '../hooks/usePagination.js'
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Globe, KeyRound, Monitor, Plus, RefreshCw, Search, Settings2, Shield, UserPlus, Users, UserX } from 'lucide-react'

export default function Admin() {
  const [email, setEmail] = useState('manager@example.com')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('United States')
  const [timezone, setTimezone] = useState('UTC')
  const [password, setPassword] = useState('secret')
  const [orgName, setOrgName] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [managers, setManagers] = useState([])
  const [logs, setLogs] = useState([])
  const [filterManagerId, setFilterManagerId] = useState('')
  const [filterEmployeeId, setFilterEmployeeId] = useState('')
  const [filterType, setFilterType] = useState('')
  const [employees, setEmployees] = useState([])
  const [managerCreds, setManagerCreds] = useState([])
  const [tab, setTab] = useState('managers')
  const [selectedLog, setSelectedLog] = useState(null)
  const [auditView, setAuditView] = useState('simple')

  const submit = async (e) => {
    e.preventDefault()
    setMsg(''); setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      if (!orgName || !orgName.trim()) { setError('Team name is required'); return }
      if (!name || !name.trim()) { setError('Full Name is required'); return }
      if (!country || !country.trim()) { setError('Country is required'); return }
      if (!timezone || !timezone.trim()) { setError('Timezone is required'); return }
      const r = await axios.post(`${BASE}/api/admin/managers`, { email, name, country, timezone, password, orgName }, { headers })
      setMsg(`Manager ${r.data?.manager?.email} created${r.data?.organization ? ' with team '+r.data.organization.name : ''}.`)
      setEmail(''); setPassword(''); setOrgName(''); setName(''); setCountry('United States'); setTimezone('UTC')
      loadManagers()
      loadManagerCreds()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }


  const loadManagers = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      const r = await axios.get(`${BASE}/api/admin/managers`, { headers })
      setManagers(r.data?.managers || [])
    } catch {}
  }

  const loadManagerCreds = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      const r = await axios.get(`${BASE}/api/admin/managers/creds`, { headers })
      setManagerCreds(r.data?.creds || [])
    } catch {}
  }

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      const r = await axios.get(`${BASE}/api/employees`, { headers })
      setEmployees(r.data?.users || [])
    } catch {}
  }

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const params = {}
      if (filterManagerId) params.managerId = filterManagerId
      if (filterEmployeeId) params.employeeId = filterEmployeeId
      if (filterType) params.type = filterType
      const BASE = await resolveApiBase()
      const r = await axios.get(`${BASE}/api/admin/audit-logs`, { headers, params })
      setLogs(r.data?.logs || [])
    } catch {}
  }

  useEffect(() => {
    loadManagers()
    loadLogs()
    loadEmployees()
    loadManagerCreds()
  }, [])

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const handler = () => { loadEmployees() }
    s.on('employees:updated', handler)
    return () => { try { s.off('employees:updated', handler) } catch {} }
  }, [])
  useEffect(() => {
    loadLogs()
  }, [filterManagerId, filterEmployeeId, filterType])

  const removeManager = async (id) => {
    setMsg(''); setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      await axios.delete(`${BASE}/api/admin/managers/${id}`, { headers })
      setMsg('Manager removed')
      loadManagers()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  const removeEmployee = async (email) => {
    setMsg(''); setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      await axios.delete(`${BASE}/api/employees/${encodeURIComponent(email)}`, { headers })
      setMsg('Employee removed')
      loadEmployees()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  const tabs = [
    { value: 'managers', label: 'Managers', count: managers.length, icon: <Users className="w-4 h-4" /> },
    { value: 'employees', label: 'Employees', count: employees.length, icon: <Shield className="w-4 h-4" /> },
    { value: 'audit', label: 'Audit Logs', count: logs.length, icon: <FileText className="w-4 h-4" /> },
  ]

  const eventTypes = React.useMemo(() => {
    const set = new Set()
    for (const l of logs) {
      if (l?.type) set.add(l.type)
    }
    return Array.from(set).sort()
  }, [logs])

  const managersPg = usePagination(managers, 10, [tab, managers.length])
  const managerCredsPg = usePagination(managerCreds, 10, [tab, managerCreds.length])
  const employeesPg = usePagination(employees, 10, [tab, employees.length])
  const logsPg = usePagination(logs, 10, [tab, filterManagerId, filterEmployeeId, filterType, logs.length])

  const getAuditMeta = (l) => {
    const type = String(l?.type || '')
    const make = (label, Icon, tone) => ({ label, Icon, tone })
    if (type.startsWith('request_')) {
      if (type === 'request_approved') return make('Request approved', CheckCircle2, 'emerald')
      if (type === 'request_rejected') return make('Request rejected', UserX, 'rose')
      return make('Request updated', FileText, 'blue')
    }
    if (type === 'employee_created') return make('Employee created', UserPlus, 'emerald')
    if (type === 'employee_deleted') return make('Employee removed', UserX, 'rose')
    if (type === 'employee_timezone_updated') return make('Timezone updated', Globe, 'blue')
    if (type === 'interval_set') return make('Capture interval set', Settings2, 'violet')
    if (type === 'payment_success') return make('Payment success', CreditCard, 'emerald')
    if (type === 'billing_low_credits') return make('Low credits warning', AlertTriangle, 'amber')
    if (type === 'billing_suspended') return make('Account suspended', AlertTriangle, 'rose')
    if (type === 'live_view_start') return make('Live view started', Monitor, 'blue')
    if (type === 'live_view_stop') return make('Live view stopped', Monitor, 'slate')
    if (type === 'rbac_forbidden') return make('Blocked request', KeyRound, 'rose')
    if (type === 'rbac_invalid_token') return make('Invalid token', KeyRound, 'rose')
    const label = type
      ? type.split('_').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ')
      : 'Event'
    return make(label, FileText, 'slate')
  }

  const auditToneClasses = (tone) => {
    if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
    if (tone === 'blue') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-900/40'
    if (tone === 'violet') return 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 border-violet-200 dark:border-violet-900/40'
    if (tone === 'amber') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
    if (tone === 'rose') return 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-900/40'
    return 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Administration</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Manage users and review your company audit trail.</p>
        </div>
        <Tabs value={tab} onChange={setTab} items={tabs} />
      </div>

      {(error || msg) && (
        <div className="space-y-2">
          {error && <div className="text-red-700 dark:text-red-300 text-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">{error}</div>}
          {msg && <div className="text-blue-700 dark:text-blue-300 text-sm bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-xl">{msg}</div>}
        </div>
      )}

      {tab === 'managers' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Manager</h2>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Plus className="w-4 h-4" />
                New account
              </div>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-3">
                <TextField label="Full Name" value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" />
                <CountrySelect value={country} onChange={e=>setCountry(e.target.value)} />
                <TimezoneSelect value={timezone} onChange={e=>setTimezone(e.target.value)} />
                <TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="manager@example.com" />
                <TextField label="Password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Secret" type="password" />
                <TextField label="Team Name" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Engineering" />
              </div>
              <button className="w-full px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600" type="submit">Create Account</button>
            </form>
            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Storage</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Screenshots are stored in employee-owned Google Drive. Deleting Drive files is not available from this admin console.</div>
            </div>
          </section>

          <div className="xl:col-span-3 space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Managers</h3>
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={loadManagers} type="button">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employees</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {managersPg.pageItems.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{m.full_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{m.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{m.organization?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{m.employeeCount}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-semibold" onClick={()=>removeManager(m.id)} type="button">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {managersPg.total === 0 && <tr><td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No managers found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="px-6 pb-5">
                <Pagination
                  page={managersPg.page}
                  pageCount={managersPg.pageCount}
                  total={managersPg.total}
                  pageSize={managersPg.pageSize}
                  onPageChange={managersPg.setPage}
                />
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Manager Initial Credentials</h3>
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={loadManagerCreds} type="button">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Initial Password</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {managerCredsPg.pageItems.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{c.manager_email}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 font-mono">{c.temp_password}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {managerCredsPg.total === 0 && <tr><td colSpan="3" className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No credentials found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="px-6">
                <Pagination
                  page={managerCredsPg.page}
                  pageCount={managerCredsPg.pageCount}
                  total={managerCredsPg.total}
                  pageSize={managerCredsPg.pageSize}
                  onPageChange={managerCredsPg.setPage}
                />
              </div>
              <div className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">For security, advise managers to change their password after first login.</div>
            </section>
          </div>
        </div>
      )}

      {tab === 'employees' && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Employees</h3>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={loadEmployees} type="button">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {employeesPg.pageItems.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 font-mono">{u.managerId || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-semibold" onClick={()=>removeEmployee(u.email)} type="button">Remove</button>
                    </td>
                  </tr>
                ))}
                {employeesPg.total === 0 && <tr><td colSpan="4" className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No employees found.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-5">
            <Pagination
              page={employeesPg.page}
              pageCount={employeesPg.pageCount}
              total={employeesPg.total}
              pageSize={employeesPg.pageSize}
              onPageChange={employeesPg.setPage}
            />
          </div>
        </section>
      )}

      {tab === 'audit' && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-bold text-slate-900 dark:text-white">Audit Logs</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuditView(v => v === 'simple' ? 'technical' : 'simple')}
                className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700/40"
              >
                {auditView === 'simple' ? 'Technical view' : 'Simple view'}
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={loadLogs} type="button">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Actor (name/email)..." value={filterManagerId} onChange={e=>setFilterManagerId(e.target.value)} />
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Target employee (name/email)..." value={filterEmployeeId} onChange={e=>setFilterEmployeeId(e.target.value)} />
              </div>
              <select className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={filterType} onChange={e=>setFilterType(e.target.value)}>
                <option value="">All events</option>
                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {auditView === 'simple' ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {logsPg.total === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No logs found.</div>
              ) : (
                logsPg.pageItems.map((l, i) => {
                  const meta = getAuditMeta(l)
                  const Icon = meta.Icon
                  const actor = l.actor?.name || l.actor?.email || l.details?.actorId || '-'
                  const target = l.targetEmployee?.name || l.targetEmployee?.email || l.details?.employeeId || '-'
                  const time = l.ts_local || (l.ts ? new Date(l.ts).toLocaleString() : '-')
                  const badge = auditToneClasses(meta.tone)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedLog(l)}
                      className="w-full text-left px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center ${badge}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{meta.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{time}{l.timezone ? ` • ${l.timezone}` : ''}</div>
                          </div>
                          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                            {l.summary || meta.label}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">By</span>
                            <span className="truncate max-w-[18rem]">{actor}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Target</span>
                            <span className="truncate max-w-[18rem]">{target}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl border text-xs font-bold ${badge}`}>
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {logsPg.pageItems.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer" onClick={() => setSelectedLog(l)}>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{l.ts_local || (l.ts ? new Date(l.ts).toLocaleString() : '-')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700">{l.type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">{l.actor?.name || l.actor?.email || l.details?.actorId || '-'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{l.actor?.email && l.actor?.name ? l.actor.email : l.actor?.role || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">{l.targetEmployee?.name || l.targetEmployee?.email || l.details?.employeeId || '-'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{l.targetEmployee?.email && l.targetEmployee?.name ? l.targetEmployee.email : ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xl truncate" title={l.summary || ''}>{l.summary || '-'}</td>
                    </tr>
                  ))}
                  {logsPg.total === 0 && <tr><td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-6 pb-5">
            <Pagination
              page={logsPg.page}
              pageCount={logsPg.pageCount}
              total={logsPg.total}
              pageSize={logsPg.pageSize}
              onPageChange={logsPg.setPage}
            />
          </div>
        </section>
      )}

      <AuditDetailsDrawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  )
}
