import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import Pagination from '../components/ui/Pagination.jsx'
import { usePagination } from '../hooks/usePagination.js'
import ImageViewerModal from '../components/ui/ImageViewerModal.jsx'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Report() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [files, setFiles] = useState([])
  const [sessions, setSessions] = useState([])
  const [grouped, setGrouped] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const sessionsPg = usePagination(sessions, 10, [selectedEmployee, fromDate, toDate, sessions.length])
  const filesPg = usePagination(files, 10, [selectedEmployee, fromDate, toDate, files.length])

  const employeeNameByEmail = useMemo(() => {
    const map = new Map()
    for (const u of employees) {
      const email = u?.email
      if (!email) continue
      map.set(email, u?.full_name || u?.name || '')
    }
    return map
  }, [employees])

  const totalsByEmployee = useMemo(() => {
    const out = []
    for (const e of grouped) {
      const email = e?.employeeId
      const list = Array.isArray(e?.sessions) ? e.sessions : []
      let active = 0
      let idle = 0
      let net = 0
      let timezone = null
      for (const s of list) {
        active += Number(s?.activeSeconds) || 0
        idle += Number(s?.idleSeconds) || 0
        net += Number(s?.netActiveSeconds) || 0
        timezone = timezone || s?.timezone || null
      }
      out.push({
        email,
        name: employeeNameByEmail.get(email) || '',
        sessionsCount: list.length,
        activeSeconds: active,
        idleSeconds: idle,
        netSeconds: net,
        timezone,
      })
    }
    out.sort((a, b) => (b.netSeconds || 0) - (a.netSeconds || 0))
    return out
  }, [employeeNameByEmail, grouped])

  const overallTotals = useMemo(() => {
    let active = 0
    let idle = 0
    let net = 0
    let sessionsCount = 0
    for (const r of totalsByEmployee) {
      active += Number(r?.activeSeconds) || 0
      idle += Number(r?.idleSeconds) || 0
      net += Number(r?.netSeconds) || 0
      sessionsCount += Number(r?.sessionsCount) || 0
    }
    return { activeSeconds: active, idleSeconds: idle, netSeconds: net, sessionsCount, employeesCount: totalsByEmployee.length }
  }, [totalsByEmployee])

  const totalsPg = usePagination(totalsByEmployee, 10, [selectedEmployee, fromDate, toDate, totalsByEmployee.length])

  const viewerImages = React.useMemo(() => {
    return files
      .map((f) => {
        const src = f.preview_url
          ? (f.preview_url.startsWith('http') ? f.preview_url : `${API}${f.preview_url}`)
          : (f.drive_file_id || f.fileId || f.id) ? `${API}/api/uploads/preview/${f.drive_file_id || f.fileId || f.id}` : ''
        if (!src) return null
        const caption = [
          f.employeeId ? `Employee: ${f.employeeId}` : null,
          f.ts_local || (f.ts ? new Date(f.ts).toLocaleString() : null),
          f.timezone ? `TZ: ${f.timezone}` : null,
        ].filter(Boolean).join(' · ')
        return { src, alt: 'Screenshot', caption }
      })
      .filter(Boolean)
  }, [files])

  const openViewerForFile = (f) => {
    const id = String(f?.drive_file_id || f?.fileId || f?.id || '')
    const idx = Math.max(
      0,
      viewerImages.findIndex((it) => String(it?.src || '').includes(id))
    )
    setViewerIndex(idx)
    setViewerOpen(true)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    resolveApiBase().then((BASE)=>{
      API = BASE
      axios.get(`${BASE}/api/employees`, { headers }).then(r => setEmployees(r.data.users || [])).catch(()=>{})
    })
  }, [])

  const search = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      
      const employeeId = (selectedEmployee || '').trim()
      const params = {}
      if (employeeId) params.employeeId = employeeId

      // Normalize date-only inputs to inclusive day range
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

      if (fromDate && !toDate) {
        // Single-date search: cover the full selected day
        params.from = toStartISO(fromDate)
        params.to = toEndISO(fromDate)
      } else {
        if (fromDate) params.from = toStartISO(fromDate)
        if (toDate) params.to = toEndISO(toDate)
      }

      const [shotsRes, sessRes] = await Promise.all([
        axios.get(`${API}/api/uploads/query`, { headers, params }),
        axios.get(`${API}/api/work/sessions/range`, { headers, params })
      ])
      
      setFiles(shotsRes.data?.files || [])
      
      const list = Array.isArray(sessRes.data?.employees) ? sessRes.data.employees : []
      // If specific employee selected, find them; else show all sessions from all
      if (employeeId) {
        const one = list.find(e => e.employeeId === employeeId)
        setSessions(one ? (one.sessions || []) : [])
        setGrouped(one ? [one] : [])
      } else {
        setGrouped(list)
        // Flatten all
        const all = []
        list.forEach(e => {
          (e.sessions || []).forEach(s => all.push({ ...s, employee: e.employeeId }))
        })
        setSessions(all)
      }

    } catch (e) {
      console.error(e)
      setFiles([])
      setSessions([])
      setGrouped([])
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}h ${mm}m`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Reports</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Analyze work sessions and evidence.</p>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Employee</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={selectedEmployee} 
              onChange={e=>setSelectedEmployee(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.email} value={e.email}>{e.email}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">From Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={fromDate} 
              onChange={e=>setFromDate(e.target.value)} 
            />
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">To Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={toDate} 
              onChange={e=>setToDate(e.target.value)} 
            />
          </div>

          <button 
            onClick={search}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-70"
          >
            {loading ? 'Searching...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8">
        {totalsByEmployee.length > 0 && (
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Totals</h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {selectedEmployee ? 'Totals for the selected employee and date range.' : 'Totals per employee and overall for the selected date range.'}
                  </p>
                </div>
                {!!selectedEmployee && totalsByEmployee[0]?.timezone && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Timezone: {totalsByEmployee[0].timezone}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net working</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatDuration(overallTotals.netSeconds)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Idle</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatDuration(overallTotals.idleSeconds)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatDuration(overallTotals.activeSeconds)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{selectedEmployee ? 'Sessions' : 'Employees'}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedEmployee ? String(overallTotals.sessionsCount) : String(overallTotals.employeesCount)}</div>
                </div>
              </div>
            </div>

            {!selectedEmployee && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Net</th>
                        <th className="px-6 py-3">Idle</th>
                        <th className="px-6 py-3">Active</th>
                        <th className="px-6 py-3">Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {totalsPg.total === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No totals found.</td></tr>
                      ) : (
                        totalsPg.pageItems.map((r) => (
                          <tr key={r.email} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{r.name || '—'}</td>
                            <td className="px-6 py-4">{r.email}</td>
                            <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">{formatDuration(r.netSeconds)}</td>
                            <td className="px-6 py-4">{formatDuration(r.idleSeconds)}</td>
                            <td className="px-6 py-4">{formatDuration(r.activeSeconds)}</td>
                            <td className="px-6 py-4">{String(r.sessionsCount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 pb-5">
                  <Pagination
                    page={totalsPg.page}
                    pageCount={totalsPg.pageCount}
                    total={totalsPg.total}
                    pageSize={totalsPg.pageSize}
                    onPageChange={totalsPg.setPage}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* Sessions Table */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Work Sessions ({sessions.length})</h3>
              {!!selectedEmployee && totalsByEmployee.length > 0 && (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Total: {formatDuration(totalsByEmployee[0]?.netSeconds || 0)}
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {sessionsPg.total === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No sessions found for this criteria.</td></tr>
                ) : (
                  sessionsPg.pageItems.map((s, i) => {
                    const stLocal = s.startedAt_local
                    const enLocal = s.endedAt_local
                    const startUtc = s.startedAt ? new Date(s.startedAt) : null
                    const endUtc = s.endedAt ? new Date(s.endedAt) : null
                    
                    // Handle active sessions: calculate duration from start to now
                    const now = new Date()
                    const activeSeconds = Number.isFinite(Number(s?.activeSeconds))
                      ? Number(s.activeSeconds)
                      : (startUtc ? Math.max(0, Math.floor(((endUtc || now) - startUtc) / 1000)) : 0)
                    const idleSeconds = Number.isFinite(Number(s?.idleSeconds)) ? Number(s.idleSeconds) : 0
                    const netSeconds = Number.isFinite(Number(s?.netActiveSeconds))
                      ? Number(s.netActiveSeconds)
                      : Math.max(0, activeSeconds - idleSeconds)
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{s.employee || selectedEmployee}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {stLocal || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {enLocal || <span className="text-green-600 dark:text-green-400 font-medium">Active (Ongoing)</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {stLocal ? (
                            <div>
                              <div className="text-slate-900 dark:text-white font-medium">{formatDuration(netSeconds)}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Idle: {formatDuration(idleSeconds)}</div>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-5">
            <Pagination
              page={sessionsPg.page}
              pageCount={sessionsPg.pageCount}
              total={sessionsPg.total}
              pageSize={sessionsPg.pageSize}
              onPageChange={sessionsPg.setPage}
            />
          </div>
        </section>

        {/* Screenshots Grid */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Screenshots ({files.length})</h3>
          {filesPg.total === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">No screenshots found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filesPg.pageItems.map((f, i) => {
                const src = f.preview_url
                  ? (f.preview_url.startsWith('http') ? f.preview_url : `${API}${f.preview_url}`)
                  : (f.drive_file_id || f.fileId || f.id) ? `${API}/api/uploads/preview/${f.drive_file_id || f.fileId || f.id}` : ''
                if (!src) return null
                return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openViewerForFile(f)}
                  className="group relative aspect-video bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-left"
                >
                  <img
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    src={src}
                    alt="Evidence"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="w-full">
                      <div className="text-xs text-white font-medium truncate">{f.employeeId}</div>
                      <div className="text-[10px] text-slate-300">{f.ts_local || new Date(f.ts).toLocaleString()} • {f.timezone}</div>
                    </div>
                  </div>
                </button>
              )})}
            </div>
          )}
          <Pagination
            page={filesPg.page}
            pageCount={filesPg.pageCount}
            total={filesPg.total}
            pageSize={filesPg.pageSize}
            onPageChange={filesPg.setPage}
          />
        </section>

        <ImageViewerModal
          open={viewerOpen}
          images={viewerImages}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerOpen(false)}
          title="Screenshots"
        />
      </div>
    </div>
  )
}
