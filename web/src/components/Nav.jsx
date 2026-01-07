import React, { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const role = useMemo(() => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob((token || '').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      return payload?.role || ''
    } catch {
      return ''
    }
  }, [])
  
  const link = (to, label) => (
    <Link 
      className={`px-3 py-2 rounded text-sm block ${pathname===to? 'bg-blue-600 text-white':'hover:bg-blue-100'}`} 
      to={to}
      onClick={() => setIsOpen(false)}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Time Tracker Admin</div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            {link('/dashboard', 'Dashboard')}
            {link('/live', 'Live View')}
            {link('/report', 'Reports')}
            {link('/activity', 'Activity')}
            {link('/work-hours', 'Work Hours')}
            {link('/setup', 'Setup')}
            {role === 'super_admin' && link('/admin', 'Admin')}
            <Link className={`px-3 py-2 rounded text-sm ${pathname==='/downloads'? 'bg-blue-600 text-white':'hover:bg-blue-100'}`} to="/downloads" title="Step-by-step guide to install the desktop client">Downloads</Link>
          </div>

          <div className="hidden md:block ml-auto">
            <button className="px-3 py-2 rounded text-sm hover:bg-red-100" onClick={() => {localStorage.removeItem('token'); location.href='/login'}}>
              Logout
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isOpen && (
          <div className="md:hidden mt-3 space-y-2 border-t pt-3">
            {link('/dashboard', 'Dashboard')}
            {link('/live', 'Live View')}
            {link('/report', 'Reports')}
            {link('/activity', 'Activity')}
            {link('/work-hours', 'Work Hours')}
            {link('/setup', 'Setup')}
            {role === 'super_admin' && link('/admin', 'Admin')}
            {link('/downloads', 'Downloads')}
            <div className="border-t pt-2 mt-2">
              <button className="w-full text-left px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50" onClick={() => {localStorage.removeItem('token'); location.href='/login'}}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
