// Core data types
export interface SpeakerConfig {
  id: string
  name: string
  voice_sample?: File | Blob
  sample_type: 'recorded' | 'uploaded'
}

export interface MeetingData {
  id: string
  title: string
  status: 'setup' | 'recording' | 'uploading' | 'processing' | 'completed' | 'error'
  audio_file?: File
  created_at: string
  speakers: SpeakerConfig[]
  transcription?: TranscriptionResult
  summary?: SummaryResult
  action_items?: ActionItemsResult
  speaker_views?: SpeakerViewsResult
  user_notes?: string
  custom_title?: string
}

export interface TranscriptionResult {
  full_text: string
  speaker_annotated_transcript: string
  segments: TranscriptSegment[]
  participants: string[]
  duration: number
}

export interface TranscriptSegment {
  speaker: string
  start: number
  end: number
  text: string
  matched_speaker?: string
  similarity_score?: number
}

export interface SummaryResult {
  summary: string // Markdown formatted
  participants: string[]
  metadata: {
    tokens_used: number
    generation_timestamp: string
  }
}

export interface ActionItemsResult {
  general_view: ActionItem[]
  speaker_views?: Record<string, ActionItem[]>
  metadata: {
    total_tokens_used: number
    total_views: number
  }
}

export interface ActionItem {
  task: string
  assignee?: string
  deadline?: string
  priority: 'high' | 'medium' | 'low'
  relevance?: 'primary' | 'secondary'
  context?: string
  completed?: boolean
}

export interface SpeakerViewsResult {
  general_view: ActionItem[]
  speaker_views: Record<string, ActionItem[]>
  metadata: {
    total_tokens_used: number
    total_views: number
  }
}

// UI State types
export type SpeakerSetupState =
  | 'empty'           // No speakers added
  | 'adding'          // Adding speaker names
  | 'sampling'        // Recording/uploading voice samples
  | 'ready'           // Ready to record/upload meeting
  | 'meeting_input'   // Recording or uploading meeting
  | 'processing'      // Backend processing
  | 'complete'        // Results available

export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'paused'
  | 'completed'
  | 'error'

export type TabType = 'summary' | 'notes' | 'transcript'

// App State
export interface AppState {
  // Meeting data
  currentMeeting: MeetingData | null
  activeTab: TabType

  // Speaker setup
  speakers: SpeakerConfig[]
  speakerSetupState: SpeakerSetupState

  // Audio recording
  recording: {
    isRecording: boolean
    recordingType: 'voice_sample' | 'meeting' | null
    targetSpeakerId?: string
    duration: number
    audioBlob?: Blob
  }

  // UI state
  ui: {
    isProcessing: boolean
    processingStep: string
    error: string | null
    uploadProgress: number
    showSpeakerSetup: boolean
  }
}

// Session persistence (no auth)
export interface SessionData {
  meetingId: string
  speakers: SpeakerConfig[]
  title: string
  notes: string
  timestamp: string
}

// Actions
export type AppAction =
  | { type: 'SET_MEETING'; payload: MeetingData }
  | { type: 'UPDATE_NOTES'; payload: string }
  | { type: 'TOGGLE_ACTION_ITEM'; payload: { id: string; checked: boolean } }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_SPEAKER'; payload: { name: string } }
  | { type: 'REMOVE_SPEAKER'; payload: { id: string } }
  | { type: 'UPDATE_SPEAKER'; payload: { id: string; updates: Partial<SpeakerConfig> } }
  | { type: 'START_RECORDING'; payload: { type: 'voice_sample' | 'meeting'; speakerId?: string } }
  | { type: 'STOP_RECORDING'; payload: { audioBlob: Blob } }
  | { type: 'SET_SPEAKER_SETUP_STATE'; payload: SpeakerSetupState }
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }

// API types
export interface ProcessMeetingRequest {
  audio: File
  speaker_names?: string
  voice_sample_1?: File
  voice_sample_2?: File
  voice_sample_3?: File
  generate_insights?: boolean
  generate_all_action_views?: boolean
}

export interface ProcessMeetingResponse {
  success: boolean
  meeting_id: string
  transcription?: TranscriptionResult
  summary?: SummaryResult
  action_items?: ActionItemsResult
  llm_insights?: any
  error?: string
}