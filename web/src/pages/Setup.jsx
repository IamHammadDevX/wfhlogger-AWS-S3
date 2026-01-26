import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useCredits } from '../CreditsContext.jsx'
import { resolveApiBase } from '../api.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Setup() {
  const { refreshCredits } = useCredits()
  const [teamName, setTeamName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('employee')
  const [inviteMsg, setInviteMsg] = useState('')
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    resolveApiBase().then((BASE) => {
      API = BASE
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      axios.get(`${BASE}/api/team`, { headers })
        .then(r => { if(r.data.team) setTeamName(r.data.team.name) })
        .catch(() => axios.get(`${BASE}/api/org`, { headers }).then(r => { if(r.data.organization) setTeamName(r.data.organization.name) }))
      axios.get(`${BASE}/api/billing/balance`, { headers })
        .then(r => setCredits(r.data?.credits || 0))
        .catch(()=>{})
    })
  }, [])

  const saveTeam = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // Use /api/org to update organization/company details
      await axios.post(`${API}/api/org`, { name: teamName }, { headers })
      setMsg('Team name updated!')
    } catch (e) {
      setMsg('Error saving team.')
    } finally {
      setLoading(false)
    }
  }

  const invite = async (e) => {
    e.preventDefault()
    setInviteMsg('')
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const body = { email: inviteEmail, name: '', managerId: null, password: null } // Optional: allow manager to set temp password?
      // Call /api/employees directly to create the user
      const r = await axios.post(`${API}/api/employees`, body, { headers })
      const login = r.data?.login
      setInviteMsg(`Employee created! Email: ${login?.email}, Temp Password: ${login?.tempPassword}`)
      setInviteEmail('')
      try { 
        refreshCredits()
        const BASE = await resolveApiBase()
        const bal = await axios.get(`${BASE}/api/billing/balance`, { headers })
        setCredits(bal.data?.credits || 0)
      } catch {}
    } catch (e) {
      if (e?.response?.status === 402) {
        setInviteMsg('Insufficient credits. Please ask your Admin to add credits.')
      } else {
        setInviteMsg(e?.response?.data?.error || 'Error creating employee.')
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Organization Setup</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Configure your team details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Team Details</h2>
          {msg && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-lg">{msg}</div>}
          <form onSubmit={saveTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization Name</label>
              <input 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={teamName} 
                onChange={e=>setTeamName(e.target.value)} 
                placeholder="Acme Corp" 
              />
            </div>
            <button 
              disabled={loading} 
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Add Employee (Direct) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Employee</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300">Available Credits: <span className="font-semibold">{credits}</span></div>
          </div>
          {inviteMsg && <div className={`mb-4 p-3 text-sm rounded-lg ${inviteMsg.startsWith('Error') ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>{inviteMsg}</div>}
          <form onSubmit={invite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Email</label>
              <input 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={inviteEmail} 
                onChange={e=>setInviteEmail(e.target.value)} 
                placeholder="employee@company.com" 
                type="email"
                required
              />
            </div>
            <button 
              className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-sm"
            >
              Create Account
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              A temporary password will be generated automatically.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
