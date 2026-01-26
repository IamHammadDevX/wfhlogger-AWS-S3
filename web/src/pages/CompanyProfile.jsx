import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [company, setCompany] = useState({ name: '', logo_url: '', billing_email: '', admin_contact_email: '', subscription_plan: '', credit_balance: 0 })
  const [logoFile, setLogoFile] = useState(null)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const previewLogo = logoFile ? URL.createObjectURL(logoFile) : company.logo_url

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const base = await resolveApiBase()
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await axios.get(`${base}/api/company/profile`, { headers })
      setCompany(data)
    } catch (e) {
      const msg = e?.response?.data?.error || e.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const base = await resolveApiBase()
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const form = new FormData()
      form.append('name', company.name)
      form.append('billing_email', company.billing_email)
      form.append('admin_contact_email', company.admin_contact_email)
      if (logoFile) form.append('logo', logoFile)
      await axios.put(`${base}/api/company/profile`, form, { headers })
      setSuccess('Company profile updated successfully')
      await fetchProfile()
    } catch (e) {
      setError(e?.response?.data?.error || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>
  if (error) return <div className="p-8 text-red-600 dark:text-red-400">{error}</div>

  return (
    <div className="space-y-8">
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 mb-3">
              <span>Tenant</span>
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              <span>Multi-Company</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Company Profile</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Manage your company information and branding.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-xl overflow-hidden">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-300 text-2xl font-bold">
                  {company.name?.[0]?.toUpperCase() || 'T'}
                </div>
              )}
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${company.subscription_plan === 'pro' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'}`}>
              {company.subscription_plan === 'pro' ? 'Pro' : 'Free'}
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-lg">{success}</div>
      )}

      {/* Company Information */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={company.name} onChange={e=>setCompany(prev=>({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Logo</label>
              <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-5">
                <div className="w-24 h-24 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-xl overflow-hidden">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-300 text-2xl font-bold">
                      {company.name?.[0]?.toUpperCase() || 'T'}
                    </div>
                  )}
                </div>
                <div>
                  <div
                    className={`rounded-xl border-2 border-dashed ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600'} p-4 text-sm text-slate-600 dark:text-slate-300`}
                    onDragEnter={e => { e.preventDefault(); setDragActive(true) }}
                    onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                    onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
                    onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) setLogoFile(e.dataTransfer.files[0]) }}
                  >
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setLogoFile(e.target.files?.[0]||null)} />
                      <span>Drag & drop or choose a file</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">PNG, JPG, or WEBP up to 2MB.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Billing Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Billing Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Email</label>
              <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={company.billing_email} onChange={e=>setCompany(prev=>({ ...prev, billing_email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
              <input disabled className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={company.subscription_plan} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Credit Balance</label>
              <input disabled className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={company.credit_balance} />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Contact */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Admin Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Admin Email</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={company.admin_contact_email} onChange={e=>setCompany(prev=>({ ...prev, admin_contact_email: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-0 bg-gradient-to-t from-white/70 dark:from-slate-900/70 to-transparent py-4">
        <button disabled={saving} onClick={onSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all">{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  )
}
