import React, { useEffect, useState } from 'react'
import { resolveApiBase } from '../api.js'
import Nav from '../components/Nav.jsx'

export default function Downloads() {
  const [apiBase, setApiBase] = useState(null)

  useEffect(() => {
    let mounted = true
    resolveApiBase().then((base) => {
      if (mounted) setApiBase(base)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Prevent broken localhost link before API base resolves
  if (!apiBase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        Preparing download…
      </div>
    )
  }

  // Use relative URL to allow serving from frontend domain (via proxy or static)
  const downloadUrl = '/downloads/TimeTrackerSetup.exe'

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Nav />

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Track time effortlessly on Windows
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          A professional desktop app with a one-click installer.
          Download, install, log in, and start tracking — no setup required.
        </p>

        <div className="flex flex-col items-center gap-4">
          <a
            href={downloadUrl}
            download
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-lg transition-all transform hover:-translate-y-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download for Windows
          </a>

          <p className="text-sm text-gray-500">
            Version 1.0.0 • Windows 10 / 11 • 64-bit
          </p>
        </div>
      </main>

      {/* Trust / Features */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              ⚡
            </div>
            <h3 className="font-semibold text-lg mb-2">Easy Installation</h3>
            <p className="text-gray-600 text-sm">
              Standard Windows installer. No technical steps required.
            </p>
          </div>

          <div className="p-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              🔒
            </div>
            <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">
              Encrypted communication. Activity tracked only while active.
            </p>
          </div>

          <div className="p-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              🔄
            </div>
            <h3 className="font-semibold text-lg mb-2">Auto Updates</h3>
            <p className="text-gray-600 text-sm">
              Always stay on the latest version automatically.
            </p>
          </div>
        </div>
      </section>

      {/* How To */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold mb-8 text-center">
          How to get started
        </h3>

        <div className="space-y-6">
          <div className="flex gap-4 bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-lg">Download</h4>
              <p className="text-gray-600">
                Click the button above to download the installer.
              </p>
            </div>
          </div>

          <div className="flex gap-4 bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-lg">Install</h4>
              <p className="text-gray-600">
                Run the installer and follow the setup wizard.
              </p>
            </div>
          </div>

          <div className="flex gap-4 bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-lg">Login & Track</h4>
              <p className="text-gray-600">
                Sign in with your account and start tracking instantly.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
