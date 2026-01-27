import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import './api.js'
import { ThemeProvider } from './ThemeContext.jsx'
import { CreditsProvider } from './CreditsContext.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LiveView from './pages/LiveView.jsx'
import Report from './pages/Report.jsx'
import Activity from './pages/Activity.jsx'
import WorkHours from './pages/WorkHours.jsx'
import Setup from './pages/Setup.jsx'
import Downloads from './pages/Downloads.jsx'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import Billing from './pages/Billing.jsx'
import CompanyProfile from './pages/CompanyProfile.jsx'
import Requests from './pages/Requests.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Support from './pages/Support.jsx'
import Contact from './pages/Contact.jsx'
import Docs from './pages/Docs.jsx'
import Layout from './components/Layout.jsx'
import EmployeeDashboard from './pages/employee/Dashboard.jsx'
import EmployeeActivity from './pages/employee/Activity.jsx'
import EmployeeReports from './pages/employee/Reports.jsx'
import EmployeeProfile from './pages/employee/Profile.jsx'
import EmployeeLayout from './components/EmployeeLayout.jsx'

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    
    if (allowedRoles) {
      if (!allowedRoles.includes(payload.role)) {
        return <Navigate to="/dashboard" replace />
      }
    }

    // Use EmployeeLayout for employee role, regular Layout for others
    if (payload.role === 'employee') {
      return <EmployeeLayout>{children}</EmployeeLayout>
    }
  } catch (e) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Support />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/docs" element={<Docs />} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute><LiveView /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/hours" element={<ProtectedRoute><WorkHours /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute allowedRoles={['manager', 'super_admin']}><Setup /></ProtectedRoute>} />
      <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><Admin /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute allowedRoles={['super_admin']}><Billing /></ProtectedRoute>} />
      <Route path="/company" element={<ProtectedRoute allowedRoles={['super_admin']}><CompanyProfile /></ProtectedRoute>} />
      
      {/* Employee Routes */}
      <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/activity" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeActivity /></ProtectedRoute>} />
      <Route path="/employee/reports" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeReports /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeProfile /></ProtectedRoute>} />
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <CreditsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </CreditsProvider>
    </ThemeProvider>
  </React.StrictMode>
)
