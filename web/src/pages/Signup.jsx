import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function Signup() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const resp = await axios.post('/api/auth/signup', { companyName, email, password })
      localStorage.setItem('token', resp.data.token)
      location.href = '/dashboard'
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Network error'
      setError(`Signup failed: ${msg}.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Workspace</h1>
          <p className="mt-2 text-slate-500">Start your company time tracking</p>
        </div>

        <form onSubmit={submit} className="bg-white shadow-xl shadow-slate-200/60 rounded-2xl p-8 border border-slate-100 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
              <input 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Acme Corp" 
                value={companyName} 
                onChange={e=>setCompanyName(e.target.value)} 
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Email</label>
              <input 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="you@company.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                type="email"
                autoComplete="email" 
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Create a strong password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                autoComplete="new-password" 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>

          <div className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </form>
        
        <p className="mt-8 text-center text-sm text-slate-400">
          © 2026 Time Tracker System
        </p>
      </div>
    </div>
  )
}
