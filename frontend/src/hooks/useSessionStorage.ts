import { useState, useEffect } from 'react'

/**
 * Hook for persisting data in session storage
 */
export function useSessionStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error)
    }
  }, [key, value])

  return [value, setValue] as const
}

/**
 * Hook for persisting meeting data with auto-save
 */
export function useMeetingPersistence() {
  const [sessionData, setSessionData] = useSessionStorage('meeting-session', {
    speakers: [],
    notes: '',
    title: '',
    timestamp: new Date().toISOString()
  })

  const updateSpeakers = (speakers: any[]) => {
    setSessionData(prev => ({
      ...prev,
      speakers,
      timestamp: new Date().toISOString()
    }))
  }

  const updateNotes = (notes: string) => {
    setSessionData(prev => ({
      ...prev,
      notes,
      timestamp: new Date().toISOString()
    }))
  }

  const updateTitle = (title: string) => {
    setSessionData(prev => ({
      ...prev,
      title,
      timestamp: new Date().toISOString()
    }))
  }

  const clearSession = () => {
    setSessionData({
      speakers: [],
      notes: '',
      title: '',
      timestamp: new Date().toISOString()
    })
  }

  return {
    sessionData,
    updateSpeakers,
    updateNotes,
    updateTitle,
    clearSession
  }
}