import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

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
      try {
        const payload = JSON.parse(atob(resp.data.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
        if (payload.role === 'employee') {
          location.href = '/employee/dashboard'
        } else {
          location.href = '/dashboard'
        }
      } catch {
        location.href = '/dashboard'
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Incorrect email or password. Please try again.')
      } else if (err.response && err.response.status === 403) {
        setError('Access denied. You do not have permission to login with this role.')
      } else {
        const msg = err?.response?.data?.error || err.message || 'Network error'
        setError(`Login failed: ${msg}.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">TimeTracker</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Sign in to your dashboard</p>
        </div>

        <form onSubmit={submit} className="bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-none rounded-2xl p-8 border border-slate-100 dark:border-slate-700 space-y-6 transition-colors">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <input 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="you@company.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                autoComplete="email" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Enter your password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                autoComplete="current-password" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Account Type</label>
              <select 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={role} 
                onChange={e=>setRole(e.target.value)}
              >
                <option value="super_admin">Super Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 dark:hover:bg-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>

          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            New here?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500 dark:hover:text-blue-300">
              Create a workspace
            </Link>
          </div>
        </form>
        
        <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
          © 2026 Time Tracker System
        </p>
      </div>
    </div>
  )
}
