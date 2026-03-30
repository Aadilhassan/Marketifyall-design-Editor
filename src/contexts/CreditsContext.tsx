/**
 * Credits Context
 * Manages credit balance state across the editor.
 * Per spec Section 4.4 and implementation plan Step 11.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { marketifyallApi, onApiEvent } from '@/services/marketifyall-api'
import type { CreditBalance } from '@/services/marketifyall-api'
import { useAuth } from './AuthContext'

interface CreditsContextType {
  balance: CreditBalance | null
  loading: boolean
  error: string | null
  showUpgradeModal: boolean
  upgradeModalData: { balance: number; cost: number; action?: string } | null
  refresh: () => Promise<void>
  dismissUpgradeModal: () => void
  canAfford: (action: string) => boolean
}

const CreditsContext = createContext<CreditsContextType>({
  balance: null,
  loading: true,
  error: null,
  showUpgradeModal: false,
  upgradeModalData: null,
  refresh: async () => {},
  dismissUpgradeModal: () => {},
  canAfford: () => false,
})

export const useCredits = () => useContext(CreditsContext)

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export const CreditsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalData, setUpgradeModalData] = useState<{ balance: number; cost: number; action?: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setBalance(null)
      setLoading(false)
      return
    }

    try {
      const data = await marketifyallApi.getCreditsBalance()
      setBalance(data)
      setError(null)
    } catch (err) {
      // Don't clear balance on refresh failure (show stale data)
      if (!balance) {
        setError('Failed to load credits')
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch on mount and when user changes
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (user) {
      intervalRef.current = setInterval(refresh, REFRESH_INTERVAL)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, refresh])

  // Listen for credit update events from API client
  useEffect(() => {
    const unsubUpdate = onApiEvent('credits:updated', (data) => {
      if (data?.remaining !== undefined && balance) {
        // Quick local update before full refresh
        setBalance(prev => prev ? {
          ...prev,
          total: data.remaining,
          subscription_credits: Math.max(0, data.remaining - (prev.topup_credits || 0)),
        } : prev)
      }
      // Full refresh to get accurate breakdown
      setTimeout(refresh, 500)
    })

    const unsubInsufficient = onApiEvent('credits:insufficient', (data) => {
      setUpgradeModalData({
        balance: data.balance || 0,
        cost: data.cost || 0,
      })
      setShowUpgradeModal(true)
    })

    return () => {
      unsubUpdate()
      unsubInsufficient()
    }
  }, [balance, refresh])

  const dismissUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
    setUpgradeModalData(null)
  }, [])

  const canAfford = useCallback((action: string): boolean => {
    if (!balance) return false
    const costs: Record<string, number> = {
      ai_text_generation: 1,
      ai_design_suggestions: 2,
      ai_background_removal: 3,
      ai_image_enhance: 5,
      ai_image_generation: 8,
      ai_full_design: 10,
      ai_video_scene: 15,
    }
    const cost = costs[action] || 0
    return balance.total >= cost
  }, [balance])

  return (
    <CreditsContext.Provider value={{
      balance,
      loading,
      error,
      showUpgradeModal,
      upgradeModalData,
      refresh,
      dismissUpgradeModal,
      canAfford,
    }}>
      {children}
    </CreditsContext.Provider>
  )
}
