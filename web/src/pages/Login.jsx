import React from 'react'
import { useState } from 'react'
import axios from 'axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('super_admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const resp = await axios.post('/api/auth/login', { email, password, role })
      localStorage.setItem('token', resp.data.token)
      location.href = '/dashboard'
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Network error'
      setError(`Login failed: ${msg}. Please verify the backend is reachable.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="bg-white shadow-lg p-6 rounded-lg w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Login</h1>
          <p className="text-sm text-gray-600">Time Tracker System</p>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm">Email</label>
          <input className="mt-1 w-full border rounded px-3 py-2" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" className="mt-1 w-full border rounded px-3 py-2" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="block text-sm">Role</label>
          <select className="mt-1 w-full border rounded px-3 py-2" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <button disabled={loading} className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
          {loading? 'Signing in…':'Login'}
        </button>
      </form>
    </div>
  )
}
