import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveApiBase } from '../api.js'

export default function Home() {
  const [apiBase, setApiBase] = useState('http://localhost:4000')

  useEffect(() => {
    resolveApiBase().then(setApiBase)
  }, [])

  const downloadUrl = `${apiBase}/downloads/TimeTrackerSetup.exe`

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">TimeTracker</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log In</Link>
          <Link to="/login" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Productivity tracking for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">modern teams.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Gain visibility into work hours, automate timesheets, and boost team efficiency with our secure, enterprise-ready platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/login" className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 hover:-translate-y-1">
              Start Tracking Now
            </Link>
            <a href={downloadUrl} className="px-8 py-4 bg-white text-slate-700 text-lg font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-1">
              Download Client
            </a>
          </div>
        </div>

        <div className="mt-20 w-full max-w-6xl mx-auto">
          <div className="relative rounded-2xl bg-slate-900 p-2 shadow-2xl shadow-slate-900/20 ring-1 ring-white/10">
            <div className="rounded-xl bg-slate-800 overflow-hidden aspect-[16/10] relative group">
              {/* Mockup UI */}
              <div className="absolute inset-0 flex flex-col bg-slate-900">
                {/* Browser Bar */}
                <div className="h-10 bg-slate-800 border-b border-white/10 flex items-center px-4 gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-6 w-1/3 bg-slate-900/50 rounded-md mx-auto"></div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Sidebar */}
                  <div className="w-48 bg-slate-900 border-r border-white/5 p-4 space-y-4 hidden md:block">
                    <div className="h-8 w-24 bg-white/5 rounded animate-pulse"></div>
                    <div className="space-y-2 pt-4">
                      <div className="h-4 w-full bg-white/5 rounded"></div>
                      <div className="h-4 w-3/4 bg-white/5 rounded"></div>
                      <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Main */}
                  <div className="flex-1 p-6 bg-[#0B1120]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {[1,2,3].map(i => (
                        <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/20 mb-3"></div>
                          <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                          <div className="h-6 w-16 bg-white/20 rounded"></div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl border border-white/5 h-64 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="h-5 w-32 bg-white/10 rounded"></div>
                        <div className="h-8 w-24 bg-blue-600/20 rounded-lg"></div>
                      </div>
                      <div className="space-y-3">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-white/5"></div>
                            <div className="flex-1 h-3 bg-white/5 rounded"></div>
                            <div className="w-20 h-3 bg-white/5 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-500">
            © 2026 Time Tracker System. Built for enterprise.
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Privacy</Link>
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Terms</Link>
            <Link to="/contact" className="hover:text-slate-900">Contact</Link>
            <Link to="/support" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}