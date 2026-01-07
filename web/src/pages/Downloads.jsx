import React, { useEffect, useState } from 'react'
import { resolveApiBase } from '../api.js'
import Nav from '../components/Nav.jsx'

export default function Downloads() {
  const [apiBase, setApiBase] = useState('http://localhost:4000')

  useEffect(() => {
    resolveApiBase().then(setApiBase)
  }, [])

  const downloadUrl = `${apiBase}/downloads/TimeTrackerClient.exe`

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Nav />
      
      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Track time effortlessly on Windows
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          The all-new desktop client. No Python installation required. Just download, login, and start tracking your productivity securely.
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <a 
            href={downloadUrl}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-lg transition-all transform hover:-translate-y-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for Windows
          </a>
          <p className="text-sm text-gray-500">
            Version 1.0.0 • 64-bit • Windows 10/11
          </p>
        </div>
      </main>

      {/* Features / Trust Section */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Instant Setup</h3>
            <p className="text-gray-600 text-sm">No dependencies or scripts. Runs immediately after download.</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">Data is encrypted. Screenshots are only taken while tracking is active.</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Auto-Updates</h3>
            <p className="text-gray-600 text-sm">Always stay on the latest version with automatic background updates.</p>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold mb-8 text-center">How to get started</h3>
        <div className="space-y-6">
          <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div>
              <h4 className="font-semibold text-lg">Download the Client</h4>
              <p className="text-gray-600">Click the button above to download <code>TimeTrackerClient.exe</code>.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div>
              <h4 className="font-semibold text-lg">Run the Installer</h4>
              <p className="text-gray-600">Double-click the file. If Windows SmartScreen appears, click "More info" then "Run anyway" (internal release).</p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <div>
              <h4 className="font-semibold text-lg">Login & Track</h4>
              <p className="text-gray-600">Use your email and password to sign in. Click "Start" to begin your session.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}