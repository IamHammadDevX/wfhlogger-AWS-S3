import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { resolveApiBase } from '../api.js'
import { getSocket } from '../socket.js'

let API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Dashboard() {
  const [team, setTeam] = useState(null)
  const [role, setRole] = useState('')
  const [employeesCount, setEmployeesCount] = useState(0)
  const [employees, setEmployees] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [managers, setManagers] = useState([])
  const [selectedManager, setSelectedManager] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    resolveApiBase().then((BASE)=>{
      API = BASE
      try { const payload = JSON.parse(atob((token || '').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); setRole(payload?.role || '') } catch {}
      const getTeamReq = axios.get(`${BASE}/api/team`, { headers })
        .then(r => {
          const t = r.data?.team || null
          if (t) setTeam(t)
          else return axios.get(`${BASE}/api/org`, { headers }).then(rr => setTeam(rr.data?.organization || null)).catch(()=>{})
        })
        .catch(() => axios.get(`${BASE}/api/org`, { headers }).then(rr => setTeam(rr.data?.organization || null)).catch(()=>{}))
      const getUsers = axios.get(`${BASE}/api/employees`, { headers }).then(r => { const list = r.data.users || []; setEmployees(list); setEmployeesCount(list.length) }).catch(()=> { setEmployees([]); setEmployeesCount(0) })
      const getFiles = axios.get(`${BASE}/api/uploads/list`, { headers }).then(r => setRecentFiles((r.data.files || []).slice(-6).reverse())).catch(()=>{})
      Promise.allSettled([getTeamReq, getUsers, getFiles]).finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => {
    const s = getSocket()
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const refreshShots = () => {
      resolveApiBase().then((BASE)=>{
        axios.get(`${BASE}/api/uploads/list`, { headers })
          .then(r => setRecentFiles((r.data.files || []).slice(-6).reverse()))
          .catch(()=>{})
      })
    }
    s.on('uploads:cleanup_done', refreshShots)
    s.on('uploads:new', refreshShots)
    return () => { s.off('uploads:cleanup_done', refreshShots); s.off('uploads:new', refreshShots) }
  }, [])

  // Load managers for super admin team switcher
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob((token || '').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      if (payload?.role === 'super_admin') {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
        resolveApiBase().then((BASE)=>{
          axios.get(`${BASE}/api/admin/managers`, { headers }).then(r => setManagers(r.data?.managers || []))
        })
      }
    } catch {}
  }, [])

  // Apply manager filter to employees and recent files
  const filteredEmployees = selectedManager ? employees.filter(e => String(e.managerId || '') === String(selectedManager)) : employees
  const filteredFiles = selectedManager ? recentFiles.filter(f => filteredEmployees.map(e=>e.email).includes(f.employeeId)) : recentFiles

  const Stat = ({label, value}) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  )

  const Quick = ({to, title, desc, icon}) => (
    <Link to={to} className="group flex flex-col p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {icon}
        </span>
        <div className="font-bold text-lg text-slate-900">{title}</div>
      </div>
      <div className="text-sm text-slate-600 leading-relaxed">{desc}</div>
    </Link>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-slate-500">Overview of your team and recent activity.</p>
        </div>
        {role === 'super_admin' && (
          <Link to="/setup" className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            Configure Team
          </Link>
        )}
      </div>

      {managers.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Team Context</label>
          <select 
            className="block w-full md:w-64 rounded-lg border-slate-200 text-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedManager} 
            onChange={e=>setSelectedManager(e.target.value)}
          >
            <option value="">All Managers</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.email} ({m.organization?.name || '-'})</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat label="Active Team" value={team?.name || 'Not configured'} />
        <Stat label="Total Employees" value={filteredEmployees.length} />
        <Stat label="Recent Screenshots" value={filteredFiles.length} />
        <Stat label="System Status" value={loading ? 'Loading…' : 'Operational'} />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Quick to="/live" title="Live View" desc="Monitor active employee screens in real-time." icon={<SvgLive/>} />
          <Quick to="/report" title="Reports" desc="Generate productivity reports and analyze work sessions." icon={<SvgCamera/>} />
          <Quick to="/activity" title="Activity Logs" desc="Detailed timeline of user activities and idle time." icon={<SvgChart/>} />
          <Quick to="/setup" title="Organization" desc="Manage team settings, invites, and permissions." icon={<SvgCog/>} />
          <Quick to="/downloads" title="Client Download" desc="Get the latest desktop tracker for Windows." icon={<SvgDownload/>} />
        </div>
      </section>

      {/* Recent screenshots */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Latest Screenshots</h2>
          <Link to="/activity" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</Link>
        </div>
        
        <div className="p-6">
          {recentFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No screenshots captured recently.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {filteredFiles.map((f, i) => (
                <div key={i} className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    src={`${API}/${f.file}`} 
                    alt="Screenshot" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-xs text-white font-medium truncate w-full">
                      {new Date(f.ts || '').toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SvgLive(){
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v11a2 2 0 01-2 2H9l-3 3v-3H5a2 2 0 01-2-2V5z"/></svg>
  )
}
function SvgCamera(){
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7zm7 2a5 5 0 100 10 5 5 0 000-10z"/></svg>
  )
}
function SvgChart(){
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3 13h6v8H3v-8zm12-6h6v14h-6V7zM9 3h6v18H9V3z"/></svg>
  )
}
function SvgCog(){
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 8a4 4 0 110 8 4 4 0 010-8zm9 4a8.96 8.96 0 01-.6 3.2l2.1 1.6-2 3.4-2.6-1A9.08 9.08 0 0115 21.6l-.4 2.7h-3.2l-.4-2.7a9.08 9.08 0 01-3.9-1.4l-2.6 1-2-3.4 2.1-1.6A8.96 8.96 0 013 12c0-1.1.2-2.2.6-3.2L2 7.2l2-3.4 2.6 1A9.08 9.08 0 019 2.4l.4-2.7h3.2l.4 2.7a9.08 9.08 0 013.9 1.4l2.6-1 2 3.4-2.1 1.6c.4 1 .6 2.1.6 3.2z"/></svg>
  )
}
function SvgDownload(){
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3a1 1 0 011 1v8.59l2.3-2.3a1 1 0 111.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.42L11 12.59V4a1 1 0 011-1zm-7 16a2 2 0 002 2h10a2 2 0 002-2v-1a1 1 0 112 0v1a4 4 0 01-4 4H7a4 4 0 01-4-4v-1a1 1 0 112 0v1z"/></svg>
  )
}
