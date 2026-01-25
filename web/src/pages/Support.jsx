import React from 'react'
import { Link } from 'react-router-dom'

export default function Support() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Support</h1>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Contact Support</h2>
            <p className="text-slate-600 mb-6">Need help with your account or have technical questions? Our support team is here to assist you.</p>
            <a href="mailto:support@timetracker.com" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Email Us
            </a>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Documentation</h2>
            <p className="text-slate-600 mb-6">Browse our detailed documentation to learn how to set up your organization, manage employees, and generate reports.</p>
            <Link to="/docs" className="inline-block px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
              View Docs
            </Link>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">How do I reset my password?</h3>
              <p className="text-slate-600">You can reset your password by clicking on the "Forgot Password" link on the login page. Follow the instructions sent to your email.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Can I change my subscription plan?</h3>
              <p className="text-slate-600">Yes, you can upgrade or downgrade your plan at any time from the Billing section in your dashboard settings.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Is my data secure?</h3>
              <p className="text-slate-600">Absolutely. We use industry-standard encryption to protect your data both in transit and at rest. Your privacy is our top priority.</p>
            </div>
          </div>
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
