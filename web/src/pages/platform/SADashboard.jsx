import React from 'react'

export default function SADashboard() {
  const [data, setData] = React.useState({ total_companies: 0, total_revenue: 0, per_company: [], country_distribution: {}, timezone_distribution: {}, growth: { monthly_revenue: [] } })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  
  React.useEffect(() => {
    import('../../api.js').then(({ resolveApiBase }) => resolveApiBase().then(base => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      fetch(`${base}/api/platform/metrics`, { headers })
        .then(r => {
          if (!r.ok) throw new Error('Failed to load metrics')
          return r.json()
        })
        .then(setData)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }))
  }, [])
  
  const distEntries = (obj) => Object.entries(obj).sort((a,b)=> b[1]-a[1])
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500 dark:text-slate-400 text-sm">Total Companies</div>
          <div className="text-3xl font-bold mt-2">{data.total_companies}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500 dark:text-slate-400 text-sm">Total Revenue (USD)</div>
          <div className="text-3xl font-bold mt-2">${Number(data.total_revenue || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500 dark:text-slate-400 text-sm">Available Credits</div>
          <div className="text-3xl font-bold mt-2">
            {data.per_company.reduce((s,c)=> s + (c.credits || 0), 0)}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Company Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Credits</th>
                <th className="py-2 pr-4">Admins</th>
                <th className="py-2 pr-4">Managers</th>
                <th className="py-2 pr-4">Employees</th>
                <th className="py-2 pr-4">Revenue (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.per_company.map(c => (
                <tr key={c.company_id} className="border-b border-slate-100 dark:border-slate-700/40">
                  <td className="py-2 pr-4">{c.name}</td>
                  <td className="py-2 pr-4">{c.plan}</td>
                  <td className="py-2 pr-4">{c.credits}</td>
                  <td className="py-2 pr-4">{c.admins}</td>
                  <td className="py-2 pr-4">{c.managers}</td>
                  <td className="py-2 pr-4">{c.employees}</td>
                  <td className="py-2 pr-4">${Number(c.revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Country Distribution</h2>
          <div className="space-y-2">
            {distEntries(data.country_distribution).map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Timezone Distribution</h2>
          <div className="space-y-2">
            {distEntries(data.timezone_distribution).map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.growth.monthly_revenue.map(it => (
            <div key={it.month} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <span className="text-slate-500 dark:text-slate-400">{it.month}</span>
              <span className="font-semibold">${Number(it.revenue || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
