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

        {/* Windows .exe — recommended */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-3 flex items-center gap-2 border-b border-blue-200 dark:border-blue-800">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">✓</span>
            <span className="font-semibold text-sm text-blue-800 dark:text-blue-300">Easiest — Recommended</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🪟</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Windows (.exe)</h3>
            </div>
            <ol className="text-sm text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside marker:text-blue-600">
              <li><strong>Download</strong> the file above and double-click it to install.</li>
              <li>Open the app (like <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">http://localhost:4000</span>), then sign in.</li>
              <li>If Windows shows a SmartScreen warning, just click <strong>"Run anyway"</strong> — it's safe.</li>
            </ol>
          </div>
        </div>

        {/* Other platforms using .py script */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Windows .py */}
          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden open:ring-2 open:ring-violet-500/30">
            <summary className="cursor-pointer px-5 py-4 flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
              <span className="text-lg">🪟</span>
              <span>Windows (Python)</span>
              <svg className="ml-auto w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 text-sm text-slate-700 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Use this if the .exe didn't work or you prefer running the code directly.</p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1.5 font-mono text-xs">
                <div><span className="text-slate-500"># Step 1 — Install Python (if you don't have it):</span></div>
                <div className="text-slate-800 dark:text-slate-200">Download from <a href="https://python.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">python.org</a> (make sure to check <strong>"Add to PATH"</strong>)</div>
                <div className="pt-1"><span className="text-slate-500"># Step 2 — Install the helper packages:</span></div>
                <div className="text-slate-800 dark:text-slate-200">pip install requests mss Pillow python-socketio websocket-client tkcalendar</div>
                <div className="pt-1"><span className="text-slate-500"># Step 3 — Run the app:</span></div>
                <div className="text-slate-800 dark:text-slate-200">python TimeTracker.py</div>
              </div>
            </div>
          </details>

          {/* Linux .py */}
          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden open:ring-2 open:ring-violet-500/30">
            <summary className="cursor-pointer px-5 py-4 flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
              <span className="text-lg">🐧</span>
              <span>Linux (Python)</span>
              <svg className="ml-auto w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 text-sm text-slate-700 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1.5 font-mono text-xs">
                <div><span className="text-slate-500"># Step 1 — Install Python &amp; Tkinter:</span></div>
                <div className="text-slate-800 dark:text-slate-200">sudo apt update && sudo apt install -y python3 python3-pip python3-tk</div>
                <div className="pt-1"><span className="text-slate-500"># Step 2 — Install the helper packages:</span></div>
                <div className="text-slate-800 dark:text-slate-200">pip3 install requests mss Pillow python-socketio websocket-client tkcalendar</div>
                <div className="pt-1"><span className="text-slate-500"># Step 3 — Run the app:</span></div>
                <div className="text-slate-800 dark:text-slate-200">python3 TimeTracker.py</div>
              </div>
            </div>
          </details>

          {/* macOS .py */}
          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden open:ring-2 open:ring-violet-500/30">
            <summary className="cursor-pointer px-5 py-4 flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
              <span className="text-lg">🍏</span>
              <span>macOS (Python)</span>
              <svg className="ml-auto w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 text-sm text-slate-700 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1.5 font-mono text-xs">
                <div><span className="text-slate-500"># Step 1 — Install Python &amp; Tkinter:</span></div>
                <div className="text-slate-800 dark:text-slate-200">brew install python@3.11 tcl-tk</div>
                <div className="pt-1"><span className="text-slate-500"># Step 2 — Install the helper packages:</span></div>
                <div className="text-slate-800 dark:text-slate-200">pip3 install requests mss Pillow python-socketio websocket-client tkcalendar</div>
                <div className="pt-1"><span className="text-slate-500"># Step 3 — Run the app:</span></div>
                <div className="text-slate-800 dark:text-slate-200">python3 TimeTracker.py</div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">⚠️ Go to <strong>System Settings → Privacy → Screen Recording</strong> and allow your terminal.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
