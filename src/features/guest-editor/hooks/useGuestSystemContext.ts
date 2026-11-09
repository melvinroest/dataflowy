import { useState, useCallback } from 'react'
import type {
  GuestSessionMetadata,
  GuestSystemInfo,
  GuestDataAsset,
  GuestAssumption,
  GuestOutOfScopeItem,
  GuestSystemContext,
} from '../types'

const DEFAULT_SESSION: GuestSessionMetadata = {
  facilitator: '',
  participants: [],
  meetingDate: '',
}

const DEFAULT_SYSTEM_INFO: GuestSystemInfo = {
  description: '',
  criticality: 'medium',
}

export function useGuestSystemContext() {
  const [session, setSession] = useState<GuestSessionMetadata>(DEFAULT_SESSION)
  const [systemInfo, setSystemInfo] = useState<GuestSystemInfo>(DEFAULT_SYSTEM_INFO)
  const [dataAssets, setDataAssets] = useState<GuestDataAsset[]>([])
  const [assumptions, setAssumptions] = useState<GuestAssumption[]>([])
  const [outOfScopeItems, setOutOfScopeItems] = useState<GuestOutOfScopeItem[]>([])

  // --- Session ---
  const updateSession = useCallback((updates: Partial<GuestSessionMetadata>) => {
    setSession((prev) => ({ ...prev, ...updates }))
  }, [])

  // --- System Info ---
  const updateSystemInfo = useCallback((updates: Partial<GuestSystemInfo>) => {
    setSystemInfo((prev) => ({ ...prev, ...updates }))
  }, [])

  // --- Data Assets ---
  const addDataAsset = useCallback((asset: Omit<GuestDataAsset, 'id'>) => {
    const newAsset: GuestDataAsset = { ...asset, id: crypto.randomUUID() }
    setDataAssets((prev) => [...prev, newAsset])
  }, [])

  const updateDataAsset = useCallback(
    (assetId: string, updates: Partial<Omit<GuestDataAsset, 'id'>>) => {
      setDataAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, ...updates } : a))
      )
    },
    []
  )

  const removeDataAsset = useCallback((assetId: string) => {
    setDataAssets((prev) => prev.filter((a) => a.id !== assetId))
  }, [])

  // --- Assumptions ---
  const addAssumption = useCallback((assumption: Omit<GuestAssumption, 'id'>) => {
    const newAssumption: GuestAssumption = { ...assumption, id: crypto.randomUUID() }
    setAssumptions((prev) => [...prev, newAssumption])
  }, [])

  const updateAssumption = useCallback(
    (assumptionId: string, updates: Partial<Omit<GuestAssumption, 'id'>>) => {
      setAssumptions((prev) =>
        prev.map((a) => (a.id === assumptionId ? { ...a, ...updates } : a))
      )
    },
    []
  )

  const removeAssumption = useCallback((assumptionId: string) => {
    setAssumptions((prev) => prev.filter((a) => a.id !== assumptionId))
  }, [])

  // --- Out of Scope ---
  const addOutOfScopeItem = useCallback((item: Omit<GuestOutOfScopeItem, 'id'>) => {
    const newItem: GuestOutOfScopeItem = { ...item, id: crypto.randomUUID() }
    setOutOfScopeItems((prev) => [...prev, newItem])
  }, [])

  const updateOutOfScopeItem = useCallback(
    (itemId: string, updates: Partial<Omit<GuestOutOfScopeItem, 'id'>>) => {
      setOutOfScopeItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
      )
    },
    []
  )

  const removeOutOfScopeItem = useCallback((itemId: string) => {
    setOutOfScopeItems((prev) => prev.filter((i) => i.id !== itemId))
  }, [])

  // --- Bulk operations ---
  const loadSystemContext = useCallback((context: GuestSystemContext) => {
    setSession(context.session)
    setSystemInfo(context.systemInfo)
    setDataAssets(context.dataAssets)
    setAssumptions(context.assumptions)
    setOutOfScopeItems(context.outOfScopeItems)
  }, [])

  const getSystemContext = useCallback(
    (): GuestSystemContext => ({
      session,
      systemInfo,
      dataAssets,
      assumptions,
      outOfScopeItems,
    }),
    [session, systemInfo, dataAssets, assumptions, outOfScopeItems]
  )

  return {
    // State (read-only)
    session,
    systemInfo,
    dataAssets,
    assumptions,
    outOfScopeItems,

    // Operations
    updateSession,
    updateSystemInfo,
    addDataAsset,
    updateDataAsset,
    removeDataAsset,
    addAssumption,
    updateAssumption,
    removeAssumption,
    addOutOfScopeItem,
    updateOutOfScopeItem,
    removeOutOfScopeItem,
    loadSystemContext,
    getSystemContext,
  }
}
