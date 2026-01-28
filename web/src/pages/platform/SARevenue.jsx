import React, { useState, useEffect } from 'react'

export default function SARevenue() {
  const [data, setData] = useState({ total_revenue: 0, growth: { monthly_revenue: [] }, per_company: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    import('../../api.js').then(({ resolveApiBase }) => resolveApiBase().then(base => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      fetch(`${base}/api/platform/metrics`, { headers })
        .then(r => {
          if (!r.ok) throw new Error('Failed to load financial data')
          return r.json()
        })
        .then(setData)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }))
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-500">Loading financials...</div>

  // Calculate some derived stats
  const monthlyRevenue = data.growth?.monthly_revenue || []
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonthRev = monthlyRevenue.find(m => m.month === currentMonth)?.revenue || 0
  const totalCredits = data.per_company?.reduce((acc, c) => acc + (c.credits || 0), 0) || 0

  // Find max revenue for chart scaling
  const maxRev = Math.max(...monthlyRevenue.map(m => m.revenue), 100)

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Revenue & Finance</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Platform financial health and credit usage</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${Number(data.total_revenue).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">This Month</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${Number(thisMonthRev).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Outstanding Credits</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalCredits.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Revenue Growth</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {monthlyRevenue.length > 0 ? (
            monthlyRevenue.map((item, i) => (
              <div key={item.month} className="flex flex-col items-center flex-1 group">
                <div 
                  className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-sm transition-all duration-500 relative group-hover:bg-blue-600 dark:group-hover:bg-blue-500"
                  style={{ height: `${(item.revenue / maxRev) * 100}%`, minHeight: '4px' }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    ${item.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 rotate-0 truncate w-full text-center">
                  {item.month}
                </div>
              </div>
            ))
          ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-400">
               No revenue data available
             </div>
          )}
        </div>
      </div>

      {/* Recent Transactions / Top Performers */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top Revenue Sources</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 text-left font-medium">Company</th>
                <th className="py-2 text-right font-medium">Credits Held</th>
                <th className="py-2 text-right font-medium">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[...(data.per_company || [])]
                .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                .slice(0, 5)
                .map(c => (
                  <tr key={c.company_id}>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-300">{c.credits}</td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      ${Number(c.revenue || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              {data.per_company?.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-slate-500">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
