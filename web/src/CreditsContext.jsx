import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from './api.js'
import { getSocket } from './socket.js'

const CreditsContext = createContext({ credits: 0, refreshCredits: () => {} })

export function CreditsProvider({ children }) {
  const [credits, setCredits] = useState(0)

  const refreshCredits = async () => {
    try {
      const base = await resolveApiBase()
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await axios.get(`${base}/api/billing/balance`, { headers })
      setCredits(data?.credits || 0)
    } catch {}
  }

  useEffect(() => {
    refreshCredits()
    const s = getSocket()
    const token = localStorage.getItem('token') || ''
    let companyId = null
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      companyId = p?.company_id || null
    } catch {}
    const handler = (p) => {
      if (p?.company_id && companyId && Number(p.company_id) === Number(companyId)) {
        setCredits(p.balance || 0)
      }
    }
    s.on('company:credits_updated', handler)
    return () => { try { s.off('company:credits_updated', handler) } catch {} }
  }, [])

  return (
    <CreditsContext.Provider value={{ credits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
