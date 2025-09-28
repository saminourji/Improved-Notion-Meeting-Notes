import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { AppState, AppAction, SpeakerConfig } from '../types'
import { v4 as uuidv4 } from 'uuid'

const initialState: AppState = {
  currentMeeting: null,
  activeTab: 'summary',
  speakers: [],
  speakerSetupState: 'empty',
  recording: {
    isRecording: false,
    recordingType: null,
    duration: 0,
  },
  ui: {
    isProcessing: false,
    processingStep: '',
    error: null,
    uploadProgress: 0,
    showSpeakerSetup: true,
  },
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MEETING':
      return {
        ...state,
        currentMeeting: action.payload,
        ui: { ...state.ui, showSpeakerSetup: false },
      }

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      }

    case 'ADD_SPEAKER':
      const newSpeaker: SpeakerConfig = {
        id: uuidv4(),
        name: action.payload.name,
        sample_type: 'recorded',
      }
      return {
        ...state,
        speakers: [...state.speakers, newSpeaker],
        speakerSetupState: state.speakers.length === 0 ? 'adding' : state.speakerSetupState,
      }

    case 'REMOVE_SPEAKER':
      return {
        ...state,
        speakers: state.speakers.filter(s => s.id !== action.payload.id),
        speakerSetupState: state.speakers.length === 1 ? 'empty' : state.speakerSetupState,
      }

    case 'UPDATE_SPEAKER':
      return {
        ...state,
        speakers: state.speakers.map(s =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates }
            : s
        ),
      }

    case 'START_RECORDING':
      return {
        ...state,
        recording: {
          ...state.recording,
          isRecording: true,
          recordingType: action.payload.type,
          targetSpeakerId: action.payload.speakerId,
          duration: 0,
        },
      }

    case 'STOP_RECORDING':
      return {
        ...state,
        recording: {
          ...state.recording,
          isRecording: false,
          audioBlob: action.payload.audioBlob,
        },
      }

    case 'SET_SPEAKER_SETUP_STATE':
      return {
        ...state,
        speakerSetupState: action.payload,
      }

    case 'SET_PROCESSING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isProcessing: action.payload,
        },
      }

    case 'SET_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
        },
      }

    case 'UPDATE_NOTES':
      return {
        ...state,
        currentMeeting: state.currentMeeting
          ? { ...state.currentMeeting, user_notes: action.payload }
          : null,
      }

    case 'TOGGLE_ACTION_ITEM':
      // Implementation for toggling action item completion
      return state // Placeholder

    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

// Custom hooks for common operations
export function useSpeakers() {
  const { state, dispatch } = useAppContext()

  const addSpeaker = (name: string) => {
    dispatch({ type: 'ADD_SPEAKER', payload: { name } })
  }

  const removeSpeaker = (id: string) => {
    dispatch({ type: 'REMOVE_SPEAKER', payload: { id } })
  }

  const updateSpeaker = (id: string, updates: Partial<SpeakerConfig>) => {
    dispatch({ type: 'UPDATE_SPEAKER', payload: { id, updates } })
  }

  return {
    speakers: state.speakers,
    addSpeaker,
    removeSpeaker,
    updateSpeaker,
    setupState: state.speakerSetupState,
  }
}

export function useRecording() {
  const { state, dispatch } = useAppContext()

  const startRecording = (type: 'voice_sample' | 'meeting', speakerId?: string) => {
    dispatch({ type: 'START_RECORDING', payload: { type, speakerId } })
  }

  const stopRecording = (audioBlob: Blob) => {
    dispatch({ type: 'STOP_RECORDING', payload: { audioBlob } })
  }

  return {
    recording: state.recording,
    startRecording,
    stopRecording,
  }
}