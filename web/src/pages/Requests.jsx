import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiBase, setApiBase] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    resolveApiBase().then(base => {
      setApiBase(base)
      fetchRequests(base)
    })
    
    const token = localStorage.getItem('token')
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
        setRole(payload.role)
    } catch {}
  }, [])

  const fetchRequests = async (base) => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // Pass base URL explicitly to axios to avoid relative path issues in some envs
      const res = await axios.get(`${base}/api/requests`, { headers })
      // Ensure we set an array even if response is malformed
      const data = res.data?.requests || []
      // Sort if needed (backend does it, but safety)
      setRequests(data)
    } catch (e) {
      console.error('Fetch requests failed:', e)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      await axios.post(`${apiBase}/api/requests/${id}/${action}`, {}, { headers })
      fetchRequests(apiBase)
    } catch (e) {
      alert('Action failed')
    }
  }

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">
        {role === 'employee' ? 'My Time Requests' : 'Time Adjustment Requests'}
      </h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Date</th>
              {(role === 'manager' || role === 'super_admin') && <th className="px-6 py-3">Employee</th>}
              <th className="px-6 py-3">Time Range</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Status</th>
              {(role === 'manager' || role === 'super_admin') && <th className="px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {requests.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No requests found</td></tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-3">{r.date}</td>
                  {(role === 'manager' || role === 'super_admin') && <td className="px-6 py-3">{r.employee_id}</td>}
                  <td className="px-6 py-3">{r.start_time} - {r.end_time}</td>
                  <td className="px-6 py-3">{r.reason}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize 
                      ${r.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        r.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {r.status}
                    </span>
                  </td>
                  {(role === 'manager' || role === 'super_admin') && (
                    <td className="px-6 py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(r.id, 'approve')} className="text-green-600 hover:text-green-800 font-medium">Approve</button>
                          <button onClick={() => handleAction(r.id, 'reject')} className="text-red-600 hover:text-red-800 font-medium">Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}