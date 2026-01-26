import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

export default function Admin() {
  const [email, setEmail] = useState('manager@example.com')
  const [password, setPassword] = useState('secret')
  const [orgName, setOrgName] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [managers, setManagers] = useState([])
  const [logs, setLogs] = useState([])
  const [filterManagerId, setFilterManagerId] = useState('')
  const [filterEmployeeId, setFilterEmployeeId] = useState('')
  const [employees, setEmployees] = useState([])
  const [managerCreds, setManagerCreds] = useState([])
  const [cleanupFrom, setCleanupFrom] = useState('')
  const [cleanupTo, setCleanupTo] = useState('')
  const [cleanupMsg, setCleanupMsg] = useState('')
  const [cleanupErr, setCleanupErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setMsg(''); setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const BASE = await resolveApiBase()
      if (!orgName || !orgName.trim()) { setError('Team name is required'); return }
      const r = await axios.post(`${BASE}/api/admin/managers`, { email, password, orgName }, { headers })
      setMsg(`Manager ${r.data?.manager?.email} created${r.data?.organization ? ' with team '+r.data.organization.name : ''}.`)
      setEmail(''); setPassword(''); setOrgName('')
      loadManagers()
      loadManagerCreds()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  const cleanupScreenshots = async () => {
    setCleanupMsg(''); setCleanupErr('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const toStartISO = (ds) => {
        if (!ds) return null
        const base = new Date(`${ds}T00:00:00`)
        return new Date(base).toISOString()
      }
      const toEndISO = (ds) => {
        if (!ds) return null
        const base = new Date(`${ds}T00:00:00`)
        const end = new Date(base.getTime() + 24*60*60*1000 - 1)
        return end.toISOString()
      }
      const body = { from: cleanupFrom ? toStartISO(cleanupFrom) : null, to: cleanupTo ? toEndISO(cleanupTo) : null }
      const BASE = await resolveApiBase()
      const r = await axios.post(`${BASE}/api/uploads/cleanup`, body, { headers })
      const removed = r.data?.removed || 0
      const bytes = r.data?.bytesFreed || 0
      setCleanupMsg(`Deleted ${removed} file(s), freed ${(bytes/1024/1024).toFixed(2)} MB`)
      setTimeout(() => setCleanupMsg(''), 5000)
    } catch (e) {
      setCleanupErr(e?.response?.data?.error || e.message)
      setTimeout(() => setCleanupErr(''), 5000)
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
    loadLogs()
  }, [filterManagerId, filterEmployeeId])

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Console</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">System-wide configuration and user management.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Manager */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create Manager</h2>
          <form className="space-y-4" onSubmit={submit}>
            {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</div>}
            {msg && <div className="text-blue-700 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">{msg}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email</label>
                <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="manager@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" type="password" placeholder="Secret" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Team Name</label>
                <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="Engineering" value={orgName} onChange={e=>setOrgName(e.target.value)} />
              </div>
            </div>
            <button className="w-full px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-sm" type="submit">Create Account</button>
          </form>
        </section>

        {/* Storage Cleanup */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Storage Cleanup</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Delete old screenshots to free up space. This action cannot be undone.</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">From Date</label>
                <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors" value={cleanupFrom} onChange={e=>setCleanupFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">To Date</label>
                <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors" value={cleanupTo} onChange={e=>setCleanupTo(e.target.value)} />
              </div>
            </div>
            <button className="w-full px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm" onClick={cleanupScreenshots}>
              Delete Screenshots
            </button>
            {cleanupErr && <div className="text-red-600 dark:text-red-400 text-sm mt-2">{cleanupErr}</div>}
            {cleanupMsg && <div className="text-green-700 dark:text-green-400 text-sm mt-2">{cleanupMsg}</div>}
          </div>
        </section>
      </div>

      {/* Managers List */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">Managers ({managers.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employees</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {managers.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{m.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{m.organization?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{m.employeeCount}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium" onClick={()=>removeManager(m.id)}>Remove</button>
                  </td>
                </tr>
              ))}
              {managers.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No managers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manager Initial Credentials */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Manager Initial Credentials</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium" onClick={loadManagerCreds}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Initial Password</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {managerCreds.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{c.manager_email}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{c.temp_password}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {managerCreds.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No manager credentials found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">For security, advise managers to change their password after first login.</div>
      </section>

      {/* Employees List */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">All Employees ({employees.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manager ID</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {employees.map((u, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{u.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{u.managerId || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium" onClick={()=>removeEmployee(u.email)}>Remove</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No employees found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Logs */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Audit Logs</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium" onClick={loadLogs}>Refresh</button>
        </div>
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex gap-4">
          <input className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors" placeholder="Filter by Manager ID..." value={filterManagerId} onChange={e=>setFilterManagerId(e.target.value)} />
          <input className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors" placeholder="Filter by Employee Email..." value={filterEmployeeId} onChange={e=>setFilterEmployeeId(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {logs.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(l.ts || l.time || Date.now()).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{l.details?.actorId || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300"><span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs font-medium border border-slate-200 dark:border-slate-600">{l.type}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{l.details?.employeeId || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={JSON.stringify(l.details)}>{l.details?.intervalMinutes ? `${l.details.intervalMinutes}m` : '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
