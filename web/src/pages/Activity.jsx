import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Activity() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    resolveApiBase().then((BASE)=>{
      API = BASE
      // Fetch activity for the last 30 days by default
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      
      const params = {
        from: from.toISOString(),
        to: to.toISOString()
      }

      axios.get(`${BASE}/api/work/sessions/range`, { headers, params })
        .then(r => {
          // Flatten sessions for a simple activity feed
          const all = []
          const emps = r.data.employees || []
          emps.forEach(e => {
            (e.sessions || []).forEach(s => {
              // Normalize field names: backend uses startedAt/endedAt, frontend used startTime/endTime
              all.push({ 
                ...s, 
                employee: e.employeeId,
                startTime: s.startedAt || s.startTime,
                endTime: s.endedAt || s.endTime
              })
            })
          })
          all.sort((a,b) => new Date(b.startTime) - new Date(a.startTime))
          setActivities(all)
        })
        .catch(() => setActivities([]))
        .finally(() => setLoading(false))
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Activity Log</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Recent work sessions (Last 30 days).</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading activity...</td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No activity recorded yet.</td></tr>
              ) : (
                activities.map((a, i) => {
                  const start = new Date(a.startTime)
                  const end = a.endTime ? new Date(a.endTime) : null
                  const dur = end ? Math.round((end - start)/1000/60) : 0
                  const isActive = !end
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{a.employee}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{start.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{end ? end.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{end ? `${Math.floor(dur/60)}h ${dur%60}m` : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'}`}>
                          {isActive ? 'Active' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}