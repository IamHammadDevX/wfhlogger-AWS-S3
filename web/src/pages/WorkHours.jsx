import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const ALLOWED_MINUTES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]

export default function WorkHours() {
  const [intervalMinutes, setIntervalMinutes] = useState(3)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    
    // Decode role
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      setRole(payload.role || '')
    } catch {}

    resolveApiBase().then(BASE => {
      API = BASE
      // Fetch employees for dropdown
      axios.get(`${BASE}/api/employees`, { headers })
        .then(r => {
          const list = r.data.users || []
          setEmployees(list)
          if (list.length > 0) setSelectedEmployee(list[0].email)
        })
        .catch(()=>{})
    })
  }, [])

  useEffect(() => {
    if (!selectedEmployee) return
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    
    axios.get(`${API}/api/capture-interval?employeeId=${selectedEmployee}`, { headers })
      .then(r => {
        if(r.data.intervalSeconds) {
          // Convert seconds to nearest allowed minute
          const mins = Math.round(r.data.intervalSeconds / 60)
          if (ALLOWED_MINUTES.includes(mins)) {
            setIntervalMinutes(mins)
          } else {
            // fallback to closest
            const closest = ALLOWED_MINUTES.reduce((prev, curr) => 
              Math.abs(curr - mins) < Math.abs(prev - mins) ? curr : prev
            )
            setIntervalMinutes(closest)
          }
        }
      })
      .catch(()=>{})
  }, [selectedEmployee])

  const save = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      
      await axios.post(`${API}/api/capture-interval`, { 
        employeeId: selectedEmployee,
        intervalMinutes: Number(intervalMinutes) 
      }, { headers })
      
      setMsg('Configuration saved successfully.')
    } catch (e) {
      setMsg('Error saving configuration: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Work Hours & Config</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Manage tracking parameters and schedule settings.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 max-w-2xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Capture Settings</h2>
        
        {msg && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex items-center ${msg.startsWith('Error') ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {msg.startsWith('Error') ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              )}
            </svg>
            {msg}
          </div>
        )}

        <form onSubmit={save} className="space-y-6">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Employee</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              disabled={employees.length === 0}
            >
              {employees.length === 0 ? <option>Loading employees...</option> : null}
              {employees.map(e => (
                <option key={e.email} value={e.email}>{e.email} ({e.name || 'No Name'})</option>
              ))}
            </select>
          </div>

          {/* Interval Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Screenshot Interval</label>
            <div className="flex items-center gap-4">
              <select
                className="w-full md:w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors"
                value={intervalMinutes}
                onChange={e => setIntervalMinutes(Number(e.target.value))}
              >
                {ALLOWED_MINUTES.map(m => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              How often the desktop client captures a screenshot for this employee.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <button 
              disabled={loading || !selectedEmployee} 
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Update Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}