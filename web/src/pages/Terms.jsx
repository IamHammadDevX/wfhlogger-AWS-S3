import React from 'react'
import { Link } from 'react-router-dom'

export default function Terms() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="text-lg leading-relaxed mb-6">Last updated: January 26, 2026</p>
          
          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using Time Tracker System ("the Service"), you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">2. Use License</h2>
          <p>We grant you a limited, non-exclusive, non-transferable license to use the Service for your internal business purposes, subject to these Terms. You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2 mb-6">
            <li>Modify, copy, or reverse engineer the Service.</li>
            <li>Use the Service for any illegal or unauthorized purpose.</li>
            <li>Attempt to bypass any security measures of the Service.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">3. Accounts</h2>
          <p>When you create an account with us, you must provide accurate and complete information. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">4. Subscriptions and Payments</h2>
          <p>Some parts of the Service are billed on a subscription basis ("Billing"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set on a monthly basis.</p>
          <p>We use third-party payment processors (e.g., Razorpay) to handle payments. By making a payment, you agree to their terms and conditions.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">5. Termination</h2>
          <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

          <h2 className="text-2xl font-semibold text-slate-800 mt-10 mb-4">6. Limitation of Liability</h2>
          <p>In no event shall Time Tracker System, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
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
