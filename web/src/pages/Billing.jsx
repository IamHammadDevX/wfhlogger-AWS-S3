import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import AddCreditsModal from '../components/AddCreditsModal'
import { useCredits } from '../CreditsContext.jsx'

export default function Billing() {
  const { refreshCredits, credits } = useCredits()
  const [tab, setTab] = useState('transactions')
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [apiBase, setApiBase] = useState('')

  useEffect(() => {
    resolveApiBase().then(base => {
      setApiBase(base)
      fetchData(base)
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('status') === 'success') {
          fetchData(base)
          refreshCredits()
        }
      } catch {}
    })
  }, [])

  const fetchData = async (base) => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const summary = await axios.get(`${base}/api/billing/summary`, { headers }).catch(e => ({ data: { balance: 0, history: [] } }))
      const inv = await axios.get(`${base}/api/billing/invoices`, { headers }).catch(e => ({ data: { invoices: [] } }))
      setBalance(summary.data.balance)
      setHistory(summary.data.history)
      setInvoices(inv.data.invoices)
    } catch (e) {
      setError('Failed to load billing info')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredits = async (amount) => {
    setProcessing(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // Stripe: create checkout session and redirect
      const { data } = await axios.post(`${apiBase}/api/billing/stripe/checkout-session`, { amount_usd: amount }, { headers })
      if (data?.url) {
        setModalOpen(false)
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL')
      }
    } catch (e) {
      alert('Failed to initiate payment')
      setProcessing(false)
    }
  }

  if (loading && balance === undefined) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">Billing & Payments</h1>
      
      {/* Balance Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Available Credits</h2>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits ?? balance}</div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">$1.00 / active employee / month</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all"
        >
          Add Credits
        </button>
      </div>

      <AddCreditsModal 
        isOpen={modalOpen} 
        onClose={() => !processing && setModalOpen(false)} 
        onConfirm={handleAddCredits}
        loading={processing}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-6">
          <button className={`text-sm font-semibold ${tab==='transactions' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`} onClick={()=>setTab('transactions')}>Transactions</button>
          <button className={`text-sm font-semibold ${tab==='invoices' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`} onClick={()=>setTab('invoices')}>Invoices</button>
        </div>
        {tab === 'transactions' ? (
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Credits</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No transactions yet</td></tr>
              ) : (
                history.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3">{t.description}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'credit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">${Number(t.amount).toFixed(2)}</td>
                    <td className="px-6 py-3">{t.credits > 0 ? `+${t.credits}` : t.credits}</td>
                    <td className="px-6 py-3 capitalize">{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {invoices.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No invoices yet</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3">{inv.invoice_id}</td>
                    <td className="px-6 py-3">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">${Number(inv.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-3 capitalize">{inv.payment_status || 'paid'}</td>
                    <td className="px-6 py-3">
                      <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition" onClick={async ()=>{
                        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        const base = await resolveApiBase()
                        const res = await axios.get(`${base}/api/billing/invoices/${inv.invoice_id}/download`, { headers, responseType: 'blob' })
                        const url = URL.createObjectURL(res.data)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${inv.invoice_id}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        URL.revokeObjectURL(url)
                      }}>Download</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
