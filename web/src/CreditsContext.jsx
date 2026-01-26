import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { resolveApiBase } from './api.js'

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
