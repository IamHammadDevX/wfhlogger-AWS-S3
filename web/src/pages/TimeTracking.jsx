import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import Pagination from '../components/ui/Pagination.jsx'
import { usePagination } from '../hooks/usePagination.js'
import { Clock, Filter, Users } from 'lucide-react'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h ${mm}m`
}

function toStartISO(ds) {
  if (!ds) return null
  const base = new Date(`${ds}T00:00:00`)
  return new Date(base).toISOString()
}

function toEndISO(ds) {
  if (!ds) return null
  const base = new Date(`${ds}T00:00:00`)
  const end = new Date(base.getTime() + 24 * 60 * 60 * 1000 - 1)
  return end.toISOString()
}

export default function TimeTracking() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [grouped, setGrouped] = useState([])
  const [focusedEmployee, setFocusedEmployee] = useState('')
  const [msg, setMsg] = useState('')

  const employeeNameByEmail = useMemo(() => {
    const map = new Map()
    for (const u of employees) {
      const email = u?.email
      if (!email) continue
      map.set(email, u?.full_name || u?.name || '')
    }
    return map
  }, [employees])

  const employeeSummaries = useMemo(() => {
    const out = []
    for (const e of grouped) {
      const email = e?.employeeId
      const list = Array.isArray(e?.sessions) ? e.sessions : []
      let active = 0
      let idle = 0
      let net = 0
      let firstStartMs = null
      let lastEndMs = null
      let firstStartLocal = null
      let lastEndLocal = null
      let timezone = null

      for (const s of list) {
        active += Number(s?.activeSeconds) || 0
        idle += Number(s?.idleSeconds) || 0
        net += Number(s?.netActiveSeconds) || 0
        timezone = timezone || s?.timezone || null
        const st = s?.startedAt ? Date.parse(s.startedAt) : null
        const en = s?.endedAt ? Date.parse(s.endedAt) : null
        if (Number.isFinite(st)) {
          if (firstStartMs == null || st < firstStartMs) {
            firstStartMs = st
            firstStartLocal = s?.startedAt_local || null
          }
        }
        if (Number.isFinite(en)) {
          if (lastEndMs == null || en > lastEndMs) {
            lastEndMs = en
            lastEndLocal = s?.endedAt_local || null
          }
        }
      }

      out.push({
        email,
        name: employeeNameByEmail.get(email) || '',
        sessionsCount: list.length,
        activeSeconds: active,
        idleSeconds: idle,
        netSeconds: net,
        firstStartLocal,
        lastEndLocal,
        timezone,
      })
    }
    out.sort((a, b) => (b.netSeconds || 0) - (a.netSeconds || 0))
    return out
  }, [employeeNameByEmail, grouped])

  const overall = useMemo(() => {
    let active = 0
    let idle = 0
    let net = 0
    let sessionsCount = 0
    for (const e of grouped) {
      const list = Array.isArray(e?.sessions) ? e.sessions : []
      sessionsCount += list.length
      for (const s of list) {
        active += Number(s?.activeSeconds) || 0
        idle += Number(s?.idleSeconds) || 0
        net += Number(s?.netActiveSeconds) || 0
      }
    }
    return { activeSeconds: active, idleSeconds: idle, netSeconds: net, sessionsCount }
  }, [grouped])

  const employeesPg = usePagination(employeeSummaries, 10, [employeeSummaries.length, fromDate, toDate, selectedEmployee])

  const focusedSessions = useMemo(() => {
    const email = focusedEmployee || selectedEmployee
    if (!email) return []
    const match = grouped.find(x => String(x?.employeeId || '').toLowerCase() === String(email).toLowerCase())
    const list = Array.isArray(match?.sessions) ? match.sessions : []
    const sorted = list.slice().sort((a, b) => {
      const am = a?.startedAt ? Date.parse(a.startedAt) : 0
      const bm = b?.startedAt ? Date.parse(b.startedAt) : 0
      return bm - am
    })
    return sorted
  }, [focusedEmployee, grouped, selectedEmployee])

  const sessionsPg = usePagination(focusedSessions, 10, [focusedEmployee, selectedEmployee, fromDate, toDate, focusedSessions.length])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    resolveApiBase().then((BASE) => {
      API = BASE
      axios.get(`${BASE}/api/employees`, { headers }).then(r => setEmployees(r.data.users || [])).catch(() => {})
    })
  }, [])

  const search = async () => {
    setLoading(true)
    setMsg('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const params = {}
      const employeeId = (selectedEmployee || '').trim()
      if (employeeId) params.employeeId = employeeId

      if (fromDate && !toDate) {
        params.from = toStartISO(fromDate)
        params.to = toEndISO(fromDate)
      } else {
        if (fromDate) params.from = toStartISO(fromDate)
        if (toDate) params.to = toEndISO(toDate)
      }

      const sessRes = await axios.get(`${API}/api/work/sessions/range`, { headers, params })
      const list = Array.isArray(sessRes.data?.employees) ? sessRes.data.employees : []
      setGrouped(list)
      if (employeeId) setFocusedEmployee(employeeId)
      if (!employeeId) setFocusedEmployee('')
    } catch (e) {
      setGrouped([])
      setFocusedEmployee('')
      setMsg(e?.response?.data?.error || 'Failed to load time tracking data.')
    } finally {
      setLoading(false)
    }
  }

  const focusEmail = focusedEmployee || selectedEmployee
  const focusName = focusEmail ? (employeeNameByEmail.get(focusEmail) || '') : ''

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Time Tracking</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Track employee work and idle time by date range.</p>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {msg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Filter className="w-5 h-5" />
          </span>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Filters</div>
            <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Select employees and date range.</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Employee</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">All employees</option>
              {employees.map(u => (
                <option key={u.email} value={u.email}>
                  {(u.full_name || u.name) ? `${u.full_name || u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">From</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">To</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
          >
            <Clock className="w-4 h-4" />
            {loading ? 'Loading…' : 'Generate'}
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Working hours are calculated as Active − Idle time from tracked sessions.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Net working hours" value={formatDuration(overall.netSeconds)} />
        <StatCard icon={Clock} label="Idle time" value={formatDuration(overall.idleSeconds)} />
        <StatCard icon={Clock} label="Active time" value={formatDuration(overall.activeSeconds)} />
        <StatCard icon={Users} label="Sessions" value={String(overall.sessionsCount)} />
      </div>

      {!selectedEmployee && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">Employees</div>
                <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Totals for the selected range.</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">First start</th>
                  <th className="px-4 py-3">Last end</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Idle</th>
                  <th className="px-4 py-3">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {employeesPg.total === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">No data yet</td></tr>
                ) : (
                  employeesPg.pageItems.map((r) => (
                    <tr
                      key={r.email}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer ${focusedEmployee === r.email ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}
                      onClick={() => setFocusedEmployee(prev => prev === r.email ? '' : r.email)}
                    >
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{r.name || '—'}</td>
                      <td className="px-4 py-3">{r.email}</td>
                      <td className="px-4 py-3">{r.firstStartLocal || '—'}</td>
                      <td className="px-4 py-3">{r.lastEndLocal || '—'}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{formatDuration(r.netSeconds)}</td>
                      <td className="px-4 py-3">{formatDuration(r.idleSeconds)}</td>
                      <td className="px-4 py-3">{String(r.sessionsCount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-5">
            <Pagination
              page={employeesPg.page}
              pageCount={employeesPg.pageCount}
              total={employeesPg.total}
              pageSize={employeesPg.pageSize}
              onPageChange={employeesPg.setPage}
            />
          </div>
        </div>
      )}

      {(focusEmail && sessionsPg.total > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  Session details {focusName ? `· ${focusName}` : ''} {focusEmail ? `· ${focusEmail}` : ''}
                </div>
                <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Start/end shown in employee timezone.</div>
              </div>
              {!selectedEmployee && focusedEmployee && (
                <button
                  type="button"
                  onClick={() => setFocusedEmployee('')}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Idle</th>
                  <th className="px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sessionsPg.pageItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">{s.date_local || s.date || '—'}</td>
                    <td className="px-4 py-3">{s.startedAt_local || '—'}</td>
                    <td className="px-4 py-3">
                      {s.endedAt_local || <span className="text-green-600 dark:text-green-400 font-semibold">Active</span>}
                    </td>
                    <td className="px-4 py-3">{formatDuration(s.activeSeconds)}</td>
                    <td className="px-4 py-3">{formatDuration(s.idleSeconds)}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{formatDuration(s.netActiveSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-5">
            <Pagination
              page={sessionsPg.page}
              pageCount={sessionsPg.pageCount}
              total={sessionsPg.total}
              pageSize={sessionsPg.pageSize}
              onPageChange={sessionsPg.setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }) {
  const Icon = icon
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">{value}</div>
        </div>
      </div>
    </div>
  )
}

