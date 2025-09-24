import axios, { AxiosError, AxiosResponse } from 'axios'
import {
  ProcessMeetingRequest,
  ProcessMeetingResponse,
  SummaryResult,
  ActionItemsResult,
  TranscriptionResult
} from '../types'

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'  // Backend server URL
  : ''  // Production URL (same origin)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for processing
  headers: {
    'Content-Type': 'multipart/form-data',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] ${response.status} ${response.config.url}`)
    return response
  },
  (error: AxiosError) => {
    console.error('[API] Response error:', error.response?.status, error.message)

    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend server is not running. Please start the backend server.')
    }

    if (error.response?.status === 500) {
      const message = error.response?.data || 'Internal server error'
      throw new Error(`Server error: ${message}`)
    }

    if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Please check the backend configuration.')
    }

    throw error
  }
)

// API Functions

/**
 * Process a complete meeting with audio file and speaker samples
 */
export async function processMeeting(
  audioFile: File,
  speakers: Array<{ name: string; voiceSample?: File | Blob }>,
  options: {
    generateInsights?: boolean
    generateAllActionViews?: boolean
  } = {}
): Promise<ProcessMeetingResponse> {
  const formData = new FormData()

  // Add meeting audio
  formData.append('audio', audioFile)

  // Add speaker data
  const speakerNames = speakers.map(s => s.name).join(',')
  if (speakerNames) {
    formData.append('speaker_names', speakerNames)
  }

  // Add voice samples (max 3 supported by backend)
  speakers.slice(0, 3).forEach((speaker, index) => {
    if (speaker.voiceSample) {
      const sampleFile = speaker.voiceSample instanceof File
        ? speaker.voiceSample
        : new File([speaker.voiceSample], `voice_sample_${index + 1}.webm`, {
            type: 'audio/webm'
          })

      formData.append(`voice_sample_${index + 1}`, sampleFile)
    }
  })

  // Add processing options
  formData.append('generate_insights', String(options.generateInsights ?? true))
  formData.append('generate_all_action_views', String(options.generateAllActionViews ?? false))

  try {
    const response = await api.post<ProcessMeetingResponse>('/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Progress tracking could be added here
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        console.log(`Upload progress: ${percentCompleted}%`)
      }
    })

    return response.data
  } catch (error) {
    console.error('Error processing meeting:', error)
    throw error
  }
}

/**
 * Generate summary from transcript with optional user notes
 */
export async function generateSummary(
  transcript: string,
  userNotes?: string,
  durationMinutes?: number
): Promise<SummaryResult> {
  const formData = new FormData()
  formData.append('transcript', transcript)

  if (userNotes) {
    formData.append('user_notes', userNotes)
  }

  if (durationMinutes) {
    formData.append('duration_minutes', String(durationMinutes))
  }

  try {
    const response = await api.post('/summarize', formData)
    return response.data
  } catch (error) {
    console.error('Error generating summary:', error)
    throw error
  }
}

/**
 * Extract action items with optional speaker-specific view
 */
export async function extractActionItems(
  transcript: string,
  speaker?: string,
  userNotes?: string
): Promise<ActionItemsResult> {
  const formData = new FormData()
  formData.append('transcript', transcript)

  if (speaker) {
    formData.append('speaker', speaker)
  }

  if (userNotes) {
    formData.append('user_notes', userNotes)
  }

  try {
    const response = await api.post('/action-items', formData)
    return {
      general_view: response.data.action_items_by_speaker || [],
      metadata: response.data.metadata || {}
    }
  } catch (error) {
    console.error('Error extracting action items:', error)
    throw error
  }
}

/**
 * Extract all action item views (general + speaker-specific)
 */
export async function extractAllActionItemViews(
  transcript: string,
  userNotes?: string
): Promise<{
  general_view: any[]
  speaker_views: Record<string, any[]>
  metadata: any
}> {
  const formData = new FormData()
  formData.append('transcript', transcript)

  if (userNotes) {
    formData.append('user_notes', userNotes)
  }

  try {
    const response = await api.post('/action-items/all-views', formData)
    return response.data
  } catch (error) {
    console.error('Error extracting all action item views:', error)
    throw error
  }
}

/**
 * Generate comprehensive insights (summary + action items)
 */
export async function generateInsights(
  transcript: string,
  userNotes?: string,
  durationMinutes?: number
): Promise<{
  summary: string
  action_items_by_speaker: any[]
  participants: string[]
  metadata: any
}> {
  const formData = new FormData()
  formData.append('transcript', transcript)

  if (userNotes) {
    formData.append('user_notes', userNotes)
  }

  if (durationMinutes) {
    formData.append('duration_minutes', String(durationMinutes))
  }

  try {
    const response = await api.post('/insights', formData)
    return response.data
  } catch (error) {
    console.error('Error generating insights:', error)
    throw error
  }
}

/**
 * Check if backend is reachable
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Try a simple GET request to see if backend is running
    await api.get('/', { timeout: 5000 })
    return true
  } catch (error) {
    console.warn('Backend health check failed:', error)
    return false
  }
}

/**
 * Utility function to handle API errors consistently
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}

export default api