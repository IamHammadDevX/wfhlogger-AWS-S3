import React, { useEffect, useState } from 'react'
import { resolveApiBase } from '../api.js'

export default function Downloads() {
  const [apiBase, setApiBase] = useState('http://localhost:4000')

  useEffect(() => {
    resolveApiBase().then(setApiBase)
  }, [])

  const downloadUrl = `${apiBase}/downloads/TimeTrackerSetup.exe`
  const pyUrl = `${apiBase}/downloads/TimeTracker.py`
  const os = (typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '')
  const isWindows = os.includes('windows')

  return (
    <div className="space-y-10">
      <div className="pt-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-center mb-2">Download Desktop Client</h1>
        <p className="text-center text-lg text-slate-600 dark:text-slate-400">Choose the installer for your operating system.</p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border shadow-sm transition ${isWindows ? 'border-blue-300 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </span>
              <div className="font-bold text-lg text-slate-900 dark:text-white">Windows Installer</div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">Download and run the installer for Windows 10/11 (64-bit).</p>
            <a href={downloadUrl} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all">
              Download TimeTrackerSetup.exe
            </a>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">v1.0.0 • Windows 10/11 • 64-bit</p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </span>
              <div className="font-bold text-lg text-slate-900 dark:text-white">Python Script (.py)</div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">Run the single-file client using Python on Linux, macOS, or Windows.</p>
            <a href={pyUrl} className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-violet-500/30 transition-all">
              Download TimeTracker.py
            </a>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Requires Python ≥ 3.10</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Installation Guides</h2>
        <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-white">Windows (.exe)</summary>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <div>1. Download and run <span className="font-mono">TimeTrackerSetup.exe</span>.</div>
            <div>2. Open the app, enter your Backend URL (e.g., <span className="font-mono">http://localhost:4000</span>), then sign in.</div>
            <div>3. If SmartScreen warns, click “Run anyway”.</div>
          </div>
        </details>
        <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-white">Windows (Python .py)</summary>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <div>Requirements: Python ≥ 3.10, pip.</div>
            <div>Install deps: <span className="font-mono">pip install requests mss Pillow python-socketio websocket-client tkcalendar</span></div>
            <div>Run: <span className="font-mono">python TimeTracker.py</span></div>
            <div>Troubleshooting: If tkinter missing, re-install Python with Tcl/Tk or install <span className="font-mono">tkcalendar</span>.</div>
          </div>
        </details>
        <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-white">Linux (Python .py)</summary>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <div>Requirements: Python ≥ 3.10, pip, Tk/Tcl.</div>
            <div>Ubuntu/Debian: <span className="font-mono">sudo apt update && sudo apt install -y python3 python3-pip python3-tk</span></div>
            <div>Install deps: <span className="font-mono">pip3 install requests mss Pillow python-socketio websocket-client tkcalendar</span></div>
            <div>Run: <span className="font-mono">python3 TimeTracker.py</span></div>
            <div>Troubleshooting: Ensure tkinter works (install <span className="font-mono">python3-tk</span>). Verify backend URL and firewall rules.</div>
          </div>
        </details>
        <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-white">macOS (Python .py)</summary>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <div>Requirements: Python ≥ 3.10, Tk/Tcl.</div>
            <div>Homebrew: <span className="font-mono">brew install python@3.11</span> and <span className="font-mono">brew install tcl-tk</span></div>
            <div>Install deps: <span className="font-mono">pip3 install requests mss Pillow python-socketio websocket-client tkcalendar</span></div>
            <div>Run: <span className="font-mono">python3 TimeTracker.py</span></div>
            <div>Troubleshooting: Ensure Tcl/Tk is installed; allow Screen Recording in Privacy settings.</div>
          </div>
        </details>
      </div>
    </div>
  )
}
