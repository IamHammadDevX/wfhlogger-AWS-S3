import React, { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const sessionsPg = usePagination(sessions, 10, [selectedEmployee, fromDate, toDate, sessions.length])
  const filesPg = usePagination(files, 10, [selectedEmployee, fromDate, toDate, files.length])

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
      } else {
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
    } finally {
      setLoading(false)
    }
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
        {/* Sessions Table */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Work Sessions ({sessions.length})</h3>
              {!!selectedEmployee && sessions.length > 0 && (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Timezone: {sessions[0]?.timezone || 'Local'}
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
                    // Fix: Backend uses startedAt/endedAt, NOT startTime/endTime
                    const startTime = s.startedAt || s.startTime
                    const endTime = s.endedAt || s.endTime
                    
                    const stLocal = s.startedAt_local
                    const enLocal = s.endedAt_local
                    const startUtc = s.startedAt ? new Date(s.startedAt) : null
                    const endUtc = s.endedAt ? new Date(s.endedAt) : null
                    
                    // Handle active sessions: calculate duration from start to now
                    const now = new Date()
                    const durMinutes = startUtc 
                      ? Math.round(((endUtc || now) - startUtc) / 1000 / 60) 
                      : 0
                    
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
                          {stLocal ? `${Math.floor(durMinutes/60)}h ${durMinutes%60}m` : '-'}
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
