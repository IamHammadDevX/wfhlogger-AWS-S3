import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from '../api.js'
import AddCreditsModal from '../components/AddCreditsModal'

export default function Billing() {
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [apiBase, setApiBase] = useState('')

  useEffect(() => {
    resolveApiBase().then(base => {
      setApiBase(base)
      fetchData(base)
    })
  }, [])

  const fetchData = async (base) => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const [balReq, histReq] = await Promise.all([
        axios.get(`${base}/api/billing/balance`, { headers }).catch(e => ({ data: { credits: 0 } })),
        axios.get(`${base}/api/billing/history`, { headers }).catch(e => ({ data: { history: [] } }))
      ])
      setBalance(balReq.data.credits)
      setHistory(histReq.data.history)
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
      // 1. Create Order
      const orderReq = await axios.post(`${apiBase}/api/billing/order`, { amount }, { headers })
      const { order } = orderReq.data

      // 2. Open Razorpay
      const options = {
        key: 'rzp_test_XoqwkndCGiWmVr', // Test Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'Time Tracker SaaS',
        description: 'Add Credits',
        order_id: order.id,
        handler: async function (response) {
          // 3. Verify Payment
          try {
            await axios.post(`${apiBase}/api/billing/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount,
              credits: amount // 1:1 ratio
            }, { headers })
            setModalOpen(false)
            alert('Payment Successful! Credits added.')
            fetchData(apiBase)
          } catch (e) {
            alert('Payment Verification Failed')
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: function() {
            setProcessing(false)
          }
        },
        prefill: {
          name: 'Company Admin',
          email: 'admin@company.com'
        },
        theme: {
          color: '#2563EB'
        }
      }

      const rzp1 = new window.Razorpay(options)
      rzp1.open()
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
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{balance}</div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">₹1.00 / active employee / month</p>
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

      {/* Transaction History */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">Transaction History</h3>
        </div>
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
                  <td className="px-6 py-3">₹{t.amount}</td>
                  <td className="px-6 py-3">{t.credits > 0 ? `+${t.credits}` : t.credits}</td>
                  <td className="px-6 py-3 capitalize">{t.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}