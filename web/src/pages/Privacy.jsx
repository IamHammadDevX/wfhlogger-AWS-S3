import React from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">TimeTracker</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="text-lg leading-relaxed mb-6">Last updated: January 26, 2026</p>
          
          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, subscribe, or contact customer support. This may include your name, email address, company name, and payment information.</p>
          <p>When you use our services, we automatically collect data about your usage, including:</p>
          <ul className="list-disc pl-5 space-y-2 mb-6">
            <li><strong>Activity Data:</strong> Timestamps of work sessions, idle time durations, and application usage logs.</li>
            <li><strong>Screenshots:</strong> Automated screen captures taken at random intervals during active work sessions (only when tracking is enabled).</li>
            <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-5 space-y-2 mb-6">
            <li>Provide, maintain, and improve our services.</li>
            <li>Process transactions and send related information, including confirmations and invoices.</li>
            <li>Generate productivity reports for your organization.</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">3. Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">4. Data Retention</h2>
          <p>We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. Screenshots and activity logs are retained according to your organization's subscription plan settings.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@timetracker.com" className="text-blue-600 hover:underline">privacy@timetracker.com</a>.</p>
        </div>
      </main>
      
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2026 Time Tracker System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
