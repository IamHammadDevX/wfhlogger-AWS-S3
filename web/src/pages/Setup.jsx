import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Setup() {
  const [teamName, setTeamName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('employee')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    resolveApiBase().then((BASE) => {
      API = BASE
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      axios.get(`${BASE}/api/team`, { headers })
        .then(r => { if(r.data.team) setTeamName(r.data.team.name) })
        .catch(() => axios.get(`${BASE}/api/org`, { headers }).then(r => { if(r.data.organization) setTeamName(r.data.organization.name) }))
    })
  }, [])

  const saveTeam = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      await axios.post(`${API}/api/team`, { name: teamName }, { headers })
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
      // This is a mockup of an invite system since the backend just creates users directly in admin
      // But let's assume this just logs or calls a hypothetical endpoint, or simply directs user to Admin
      // For now, we'll just say "Feature available in Admin panel" if they are super admin
      setInviteMsg(`Please use the Admin console to create ${inviteRole} accounts directly.`)
    } catch (e) {
      setInviteMsg('Error sending invite.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Setup</h1>
        <p className="mt-1 text-slate-500">Configure your team details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Team Details</h2>
          {msg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{msg}</div>}
          <form onSubmit={saveTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
              <input 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={teamName} 
                onChange={e=>setTeamName(e.target.value)} 
                placeholder="Acme Corp" 
              />
            </div>
            <button 
              disabled={loading} 
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Quick Invite (Mockup/Info) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 opacity-75">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Invite Members</h2>
          <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
            <p className="font-semibold">Note for Administrators</p>
            <p className="mt-1">
              To add new members to your organization, please use the 
              <a href="/admin" className="font-bold underline mx-1">Admin Console</a> 
              to create their accounts securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
