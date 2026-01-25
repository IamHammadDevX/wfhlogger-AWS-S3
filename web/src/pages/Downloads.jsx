import React, { useEffect, useState } from 'react'
import { resolveApiBase } from '../api.js'

export default function Downloads() {
  const [apiBase, setApiBase] = useState('http://localhost:4000')

  useEffect(() => {
    resolveApiBase().then(setApiBase)
  }, [])

  const downloadUrl = `${apiBase}/downloads/TimeTrackerSetup.exe`

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto pt-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
          Download Desktop Client
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Install the Time Tracker client on Windows to start tracking your work sessions automatically.
        </p>
        
        <a 
          href={downloadUrl}
          className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download for Windows
        </a>
        <p className="mt-4 text-sm text-slate-500">
          v1.0.0 • Windows 10/11 • 64-bit Installer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Instant Setup</h3>
          <p className="text-sm text-slate-600">Download, install, and sign in. No complex configuration required.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Secure & Private</h3>
          <p className="text-sm text-slate-600">End-to-end encryption for screenshots and activity data.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Auto Updates</h3>
          <p className="text-sm text-slate-600">Always run the latest version with automatic background updates.</p>
        </div>
      </div>
    </div>
  )
}