'use client'

import * as React from 'react'

interface PrivacyContextValue {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
}

const PrivacyContext = React.createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = React.useState(true)

  const togglePrivacyMode = React.useCallback(() => {
    setIsPrivacyMode((prev) => !prev)
  }, [])

  const value = React.useMemo(
    () => ({ isPrivacyMode, togglePrivacyMode }),
    [isPrivacyMode, togglePrivacyMode],
  )

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  )
}

export function usePrivacyMode() {
  const context = React.useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacyMode must be used within PrivacyProvider')
  }
  return context
}
