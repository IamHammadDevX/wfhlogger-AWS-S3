import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import AddCreditsModal from '../components/AddCreditsModal'
import { useCredits } from '../CreditsContext.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import { usePagination } from '../hooks/usePagination.js'

export default function Billing() {
  const { refreshCredits, credits } = useCredits()
  const [tab, setTab] = useState('transactions')
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [amount, setAmount] = useState(25)
  const presets = [10, 25, 50, 100, 250]

  const historyPg = usePagination(history, 10, [tab, history.length])
  const invoicesPg = usePagination(invoices, 10, [tab, invoices.length])

  useEffect(() => {
    let cancelled = false
    resolveApiBase().then(async base => {
      if (cancelled) return
      setApiBase(base)
      await fetchData(base)
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('status') === 'success') {
          setConfirming(true)
          await pollForCredits(base)
          setConfirming(false)
        }
      } catch {
        setConfirming(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const fetchData = async (base) => {
    setLoading(true)
    setError('')
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const summary = await axios.get(`${base}/api/billing/summary`, { headers })
      const nextBalance = Number(summary?.data?.balance)
      if (!Number.isFinite(nextBalance)) throw new Error('Invalid billing summary (balance)')
      if (!Array.isArray(summary?.data?.history)) throw new Error('Invalid billing summary (history)')
      setBalance(nextBalance)
      setHistory(summary.data.history)

      const inv = await axios.get(`${base}/api/billing/invoices`, { headers })
      if (!Array.isArray(inv?.data?.invoices)) throw new Error('Invalid invoices response')
      setInvoices(inv.data.invoices)
    } catch (e) {
      setError('Failed to load billing info')
    } finally {
      setLoading(false)
    }
  }

  const pollForCredits = async (base) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const lastKnown = Number(credits ?? balance ?? 0)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const { data } = await axios.get(`${base}/api/billing/balance`, { headers })
      const cur = Number(data?.credits)
      if (!Number.isFinite(cur)) continue
      if (cur > lastKnown) {
        setBalance(cur)
        await fetchData(base)
        await refreshCredits()
        return
      }
    }
  }

  const handleAddCredits = async (amount) => {
    setProcessing(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const return_path = (() => {
        try { return window.location.pathname || '/billing' } catch { return '/billing' }
      })()
      const { data } = await axios.post(`${apiBase}/api/billing/stripe/checkout-session`, { amount_usd: amount, return_path }, { headers })
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL')
      }
    } catch (e) {
      setError('Failed to initiate secure checkout')
      setProcessing(false)
    }
  }

  if (loading && balance === undefined) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">Billing & Payments</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Available Credits</h2>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits ?? balance}</div>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">$1.00 / active employee / month</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Secured by</div>
              <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Stripe</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7a5 5 0 015-5h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7z"/></svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Credits</h2>
            {error && <div className="mb-4 text-red-600 dark:text-red-400 text-sm">{error}</div>}
            {!error && confirming && <div className="mb-4 text-slate-600 dark:text-slate-300 text-sm">Payment received. Waiting for Stripe confirmation...</div>}
            <div className="flex flex-wrap gap-3 mb-4">
              {presets.map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                    amount === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  disabled={processing}
                >
                  ${v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-6">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={e => setAmount(Math.max(1, Number(e.target.value) || 1))}
                className="w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={() => handleAddCredits(amount)}
                disabled={processing}
                className={`px-5 py-2 rounded-lg font-semibold transition ${processing ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500'}`}
              >
                {processing ? 'Redirecting…' : 'Secure Checkout'}
              </button>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Your payment is processed on Stripe’s PCI‑compliant checkout. We never see or store your card details.
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Security</h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Hosted Stripe Checkout</li>
              <li>No card data stored on our servers</li>
              <li>TLS encryption end‑to‑end</li>
              <li>Role‑scoped multi‑tenant access</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-6">
          <button className={`text-sm font-semibold ${tab==='transactions' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`} onClick={()=>setTab('transactions')}>Transactions</button>
          <button className={`text-sm font-semibold ${tab==='invoices' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`} onClick={()=>setTab('invoices')}>Invoices</button>
        </div>
        {tab === 'transactions' ? (
          <div>
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
                {historyPg.total === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No transactions yet</td></tr>
                ) : (
                  historyPg.pageItems.map(t => (
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
            <div className="px-6 pb-5">
              <Pagination
                page={historyPg.page}
                pageCount={historyPg.pageCount}
                total={historyPg.total}
                pageSize={historyPg.pageSize}
                onPageChange={historyPg.setPage}
              />
            </div>
          </div>
        ) : (
          <div>
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
                {invoicesPg.total === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No invoices yet</td></tr>
                ) : (
                  invoicesPg.pageItems.map(inv => (
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
            <div className="px-6 pb-5">
              <Pagination
                page={invoicesPg.page}
                pageCount={invoicesPg.pageCount}
                total={invoicesPg.total}
                pageSize={invoicesPg.pageSize}
                onPageChange={invoicesPg.setPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
