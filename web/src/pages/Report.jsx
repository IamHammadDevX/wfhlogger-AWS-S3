import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Report() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [files, setFiles] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

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
            <h3 className="font-bold text-slate-900 dark:text-white">Work Sessions ({sessions.length})</h3>
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
                {sessions.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No sessions found for this criteria.</td></tr>
                ) : (
                  sessions.map((s, i) => {
                    // Fix: Backend uses startedAt/endedAt, NOT startTime/endTime
                    const startTime = s.startedAt || s.startTime
                    const endTime = s.endedAt || s.endTime
                    
                    const st = startTime ? new Date(startTime) : null
                    const en = endTime ? new Date(endTime) : null
                    
                    // Handle active sessions: calculate duration from start to now
                    const now = new Date()
                    const durMinutes = st 
                      ? Math.round(((en || now) - st) / 1000 / 60) 
                      : 0
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{s.employee || selectedEmployee}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {st ? st.toLocaleString() : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {en ? en.toLocaleString() : <span className="text-green-600 dark:text-green-400 font-medium">Active (Ongoing)</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {st ? `${Math.floor(durMinutes/60)}h ${durMinutes%60}m` : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Screenshots Grid */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Screenshots ({files.length})</h3>
          {files.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">No screenshots found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files.map((f, i) => (
                <div key={i} className="group relative aspect-video bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <a href={`${API}/${f.file}`} target="_blank" rel="noopener noreferrer">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      src={`${API}/${f.file}`} 
                      alt="Evidence" 
                    />
                  </a>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="w-full">
                      <div className="text-xs text-white font-medium truncate">{f.employeeId}</div>
                      <div className="text-[10px] text-slate-300">{new Date(f.ts).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
