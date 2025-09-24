# AI Meeting Notes - Frontend Technical Design Specification

## Overview
This document outlines the technical design for the AI Meeting Notes frontend interface, integrating with the existing backend API to provide an intuitive meeting analysis experience with speaker identification and real-time recording capabilities.

## System Architecture

### Technology Stack
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React Context + useReducer for app state
- **HTTP Client**: Axios for API communication
- **File Upload**: React-dropzone for drag-and-drop audio uploads
- **Audio Recording**: MediaRecorder API with react-media-recorder
- **Rich Text**: Slate.js or similar for the Notes tab editor
- **Icons**: Lucide React or Heroicons
- **Build Tool**: Vite for fast development

### Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/           # Reusable UI components
│   │   ├── layout/           # Page layout components
│   │   ├── tabs/             # Tab-specific components
│   │   ├── recording/        # Audio recording components
│   │   ├── speakers/         # Speaker setup components
│   │   └── upload/           # File upload components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API service layer
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   └── styles/               # Global styles
├── public/
└── docs/
```

## API Integration

### Backend Endpoints Integration
Based on the existing backend API:

```typescript
interface APIEndpoints {
  // Core processing
  POST /process: {
    audio: File,
    speaker_names?: string,
    voice_samples?: File[],
    generate_insights?: boolean,
    generate_all_action_views?: boolean
  }

  // LLM services
  POST /summarize: { transcript: string, user_notes?: string }
  POST /action-items: { transcript: string, speaker?: string, user_notes?: string }
  POST /action-items/all-views: { transcript: string, user_notes?: string }
  POST /insights: { transcript: string, user_notes?: string }
}
```

### Data Models
```typescript
interface MeetingData {
  id: string
  title: string
  status: 'setup' | 'recording' | 'uploading' | 'processing' | 'completed' | 'error'
  audio_file?: File
  created_at: string

  // Speaker configuration
  speakers: SpeakerConfig[]

  // Processing results
  transcription?: TranscriptionResult
  summary?: SummaryResult
  action_items?: ActionItemsResult
  speaker_views?: SpeakerViewsResult

  // User data
  user_notes?: string
  custom_title?: string
}

interface SpeakerConfig {
  id: string
  name: string
  voice_sample?: File | Blob // From recording or upload
  sample_type: 'recorded' | 'uploaded'
}

interface TranscriptionResult {
  full_text: string
  speaker_annotated_transcript: string
  segments: TranscriptSegment[]
  participants: string[]
  duration: number
}

interface SummaryResult {
  summary: string // Markdown formatted
  participants: string[]
  metadata: {
    tokens_used: number
    generation_timestamp: string
  }
}

interface ActionItemsResult {
  general_view: ActionItem[]
  speaker_views?: Record<string, ActionItem[]>
  metadata: {
    total_tokens_used: number
    total_views: number
  }
}

interface ActionItem {
  task: string
  assignee?: string
  deadline?: string
  priority: 'high' | 'medium' | 'low'
  relevance?: 'primary' | 'secondary'
  context?: string
}
```

## Component Architecture

### 1. App Layout Structure
```
App
├── SpeakerSetup (Top Section)
│   ├── SpeakerList
│   │   ├── AddSpeakerButton
│   │   └── SpeakerCard[]
│   │       ├── NameInput
│   │       ├── VoiceSampleUpload
│   │       ├── RecordVoiceSample
│   │       └── RemoveSpeaker
│   └── MeetingControls
│       ├── RecordMeetingButton
│       ├── UploadMeetingButton
│       └── ProcessButton
├── MeetingInterface (Bottom Section - Notion-like)
│   ├── Header
│   │   ├── TitleEditor (inline editable)
│   │   ├── IconBar (document, AI, settings)
│   │   └── ProcessingStatus
│   ├── TabNavigation
│   │   ├── SummaryTab
│   │   ├── NotesTab
│   │   └── TranscriptTab
│   └── ProcessingIndicator (when processing)
```

### 2. Core Components

#### Speaker Setup Components
```typescript
interface SpeakerSetupProps {
  speakers: SpeakerConfig[]
  onAddSpeaker: () => void
  onRemoveSpeaker: (id: string) => void
  onUpdateSpeaker: (id: string, updates: Partial<SpeakerConfig>) => void
  onRecordMeeting: () => void
  onUploadMeeting: (file: File) => void
  canProcess: boolean
}

interface SpeakerCardProps {
  speaker: SpeakerConfig
  onUpdate: (updates: Partial<SpeakerConfig>) => void
  onRemove: () => void
}

// Features:
// - Add/remove speakers dynamically
// - Name input for each speaker
// - Voice sample recording (30-60 seconds)
// - Voice sample file upload alternative
// - Visual feedback for sample quality
// - Meeting recording with real-time visualization
```

#### Header Component (Meeting Interface)
```typescript
interface HeaderProps {
  title: string
  onTitleChange: (title: string) => void
  processingStatus: ProcessingStatus
}

// Features:
// - Inline title editing (click to edit, blur/enter to save)
// - Processing status indicator
// - Action buttons (AI regenerate, settings)
// - Meeting metadata display
```

#### Tab Navigation
```typescript
interface TabNavigationProps {
  activeTab: 'summary' | 'notes' | 'transcript'
  onTabChange: (tab: string) => void
  tabs: TabConfig[]
}

// Features:
// - Pill-shaped design with rounded corners
// - Smooth transitions between tabs
// - Badge indicators (e.g., action item count)
// - Keyboard navigation support
```

### 3. Tab Components

#### Summary Tab
```typescript
interface SummaryTabProps {
  summary: SummaryResult
  actionItems: ActionItemsResult
  currentUser?: string // To determine "Your action items" vs "Action Items"
  onActionToggle: (itemId: string) => void
}

// Layout Sections:
// 1. Executive Summary (markdown rendered)
// 2. Key Discussion Points (bullet list)
// 3. Topical Sections (dynamic H2/H3 structure)
// 4. Action Items with speaker context
//    - "Your Action Items" (if user is participant)
//    - "Action Items" (general view)
//    - Interactive checkboxes
// 5. Next Steps
```

#### Notes Tab
```typescript
interface NotesTabProps {
  notes: string
  onNotesChange: (notes: string) => void
  isEditable: boolean
}

// Features:
// - Rich text editor (Slate.js integration)
// - Block-based editing with drag handles
// - Markdown shortcuts (/ commands)
// - Auto-save functionality
// - Support for: headings, lists, checkboxes, quotes, code
```

#### Transcript Tab
```typescript
interface TranscriptTabProps {
  transcription: TranscriptionResult
  onSearch: (query: string) => void
  searchQuery?: string
}

// Features:
// - Search/filter functionality
// - Speaker-organized display
// - Timestamp navigation
// - Copy transcript functionality
// - Collapsible sections
// - Highlight search matches
```

## User Experience Flow

### 1. Initial Setup Flow
1. **Empty State**: Speaker setup area with "Add Speaker" button
2. **Speaker Configuration**:
   - Add speakers with names
   - Record or upload voice samples for each speaker
   - Visual feedback for sample quality/duration
3. **Meeting Input**:
   - Record meeting live with real-time waveform
   - OR upload existing audio file
4. **Processing**: Batch process with all speaker data
5. **Results**: Auto-navigate to Summary tab with speaker-specific views

### 2. Speaker Setup Workflow
```typescript
// Speaker setup states
type SpeakerSetupState =
  | 'empty'           // No speakers added
  | 'adding'          // Adding speaker names
  | 'sampling'        // Recording/uploading voice samples
  | 'ready'           // Ready to record/upload meeting
  | 'meeting_input'   // Recording or uploading meeting
  | 'processing'      // Backend processing
  | 'complete'        // Results available

// Validation rules
const speakerValidation = {
  minSpeakers: 1,
  maxSpeakers: 10, // Reasonable limit
  voiceSampleDuration: { min: 10, max: 120 }, // seconds
  supportedFormats: ['wav', 'mp3', 'm4a', 'webm']
}
```

### 3. Audio Recording Implementation
```typescript
interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration: number // in seconds
  type: 'voice_sample' | 'meeting'
}

// Recording states
type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'paused'
  | 'completed'
  | 'error'

// Features:
// - Real-time waveform visualization
// - Duration timer and limits
// - Pause/resume for meeting recording
// - Audio level indicators
// - Browser compatibility handling (Safari, Chrome, Firefox)
```

### 4. Speaker-Specific Features
```typescript
// Logic for "Your Action Items" vs "Action Items"
function getActionItemsTitle(speakers: SpeakerConfig[], participants: string[]): string {
  const speakerNames = speakers.map(s => s.name.toLowerCase())
  const hasUserSpeaker = participants.some(p => speakerNames.includes(p.toLowerCase()))
  return hasUserSpeaker ? "Your Action Items" : "Action Items"
}

// Speaker view switching based on configured speakers
function renderSpeakerViews(actionItems: ActionItemsResult, speakers: SpeakerConfig[]) {
  // If only one speaker configured, show their personalized view
  if (speakers.length === 1 && actionItems.speaker_views?.[speakers[0].name]) {
    return actionItems.speaker_views[speakers[0].name]
  }
  return actionItems.general_view // General view for multi-speaker or no match
}
```

### 5. Interactive Elements

#### Checkbox Implementation
```typescript
interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  priority?: 'high' | 'medium' | 'low'
}

// Features:
// - Visual states: unchecked, checked, indeterminate
// - Priority color coding
// - Smooth animations
// - Accessibility compliance
```

#### Markdown Rendering
```typescript
// Custom markdown components for summary display
const MarkdownComponents = {
  h2: ({ children }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-md font-medium mb-2">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
  input: ({ checked, onChange }) => <Checkbox checked={checked} onChange={onChange} />,
}
```

## Styling & Design System

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6', // Blue accent
          600: '#2563eb',
        },
        gray: {
          50: '#f9fafb',   // Background
          600: '#4b5563',  // Secondary text
          900: '#111827',  // Primary text
        }
      },
      fontSize: {
        'title': ['24px', '32px'],      // Page title
        'section': ['18px', '24px'],    // Section headers
        'body': ['15px', '24px'],       // Body text
        'caption': ['13px', '18px'],    // Timestamps, metadata
      }
    }
  }
}
```

### Component Design Patterns
```typescript
// Consistent spacing utilities
const spacing = {
  section: 'mb-6',           // Between major sections
  block: 'mb-4',             // Between content blocks
  item: 'mb-2',              // Between list items
  page: 'p-6',               // Page padding
}

// Interactive states
const interactive = {
  hover: 'hover:bg-gray-50 transition-colors',
  active: 'bg-blue-50 border-blue-200',
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
}
```

## State Management

### App State Structure
```typescript
interface AppState {
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

// Session persistence (no authentication)
interface SessionData {
  meetingId: string
  speakers: SpeakerConfig[]
  title: string
  notes: string
  timestamp: string
}

// Actions
type AppAction =
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
```

### Custom Hooks
```typescript
// Speaker management
const useSpeakers = () => {
  // Add, remove, update speakers and their voice samples
  // Validation and state management for speaker setup
}

// Audio recording
const useAudioRecorder = (type: 'voice_sample' | 'meeting', maxDuration: number) => {
  // MediaRecorder API integration
  // Real-time duration tracking, waveform data
  // Browser compatibility handling
}

// Meeting processing
const useMeetingProcessor = () => {
  // Upload audio + speaker data to backend
  // Process meeting with speaker identification
  // Handle processing status and errors
}

// Session persistence (no auth)
const useSessionStorage = (key: string) => {
  // Persist meeting data in browser session
  // Auto-save drafts and speaker configurations
}
```

## Performance Considerations

1. **Code Splitting**: Lazy load tab components
2. **Memoization**: React.memo for expensive renders
3. **Virtualization**: For long transcripts (react-window)
4. **Debouncing**: Search and auto-save operations
5. **Optimistic Updates**: Immediate UI feedback

## Accessibility Features

1. **Keyboard Navigation**: Full keyboard support for all interactions
2. **Screen Reader**: ARIA labels and semantic HTML
3. **Color Contrast**: WCAG AA compliance
4. **Focus Management**: Proper focus flow and indicators

## Error Handling & Loading States

### Error Boundaries
```typescript
interface ErrorState {
  hasError: boolean
  error: Error | null
  errorBoundary: 'upload' | 'processing' | 'display' | null
}
```

### Loading States
- **Upload**: Progress bar with file validation feedback
- **Processing**: Step-by-step progress (diarization → transcription → LLM)
- **API Calls**: Skeleton loading for content areas

## Requirements Summary

Based on clarification, the frontend will implement:

### ✅ **Confirmed Requirements**
1. **No Authentication**: Session-based, no user accounts
2. **Session Storage**: In-browser persistence only, no permanent storage
3. **Speaker Setup**: Top section with name + voice sample (record or upload)
4. **Single Meeting**: Keep it simple, one meeting at a time
5. **No Export**: No PDF/email functionality
6. **No Real-time Updates**: Process completion polling only

### 🎯 **Core User Flow**
```
1. User adds speakers (name + voice sample)
2. User records/uploads meeting audio
3. System processes with speaker identification
4. Results displayed in Notion-like interface
5. Speaker-specific action items shown appropriately
```

## Implementation Plan

The development will proceed in these phases:

### **Phase 1**: Speaker Setup & Recording Infrastructure
1. **Speaker Management Components**
   - Add/remove speakers with validation
   - Voice sample recording with MediaRecorder API
   - File upload alternative for voice samples
   - Visual feedback and quality indicators

2. **Audio Recording System**
   - Meeting recording with real-time waveform
   - Duration limits and pause/resume functionality
   - Browser compatibility layer (Chrome, Safari, Firefox)

### **Phase 2**: Core Meeting Interface
3. **Notion-like Layout**
   - Header with inline title editing
   - Tab navigation (Summary, Notes, Transcript)
   - Processing status indicators

4. **Backend Integration**
   - API service layer for all endpoints
   - File upload with speaker data
   - Processing status polling

### **Phase 3**: Content Display & Interaction
5. **Summary & Action Items**
   - Markdown rendering with custom components
   - Interactive checkboxes with state persistence
   - Speaker-specific view logic ("Your Action Items" vs "Action Items")

6. **Notes & Transcript**
   - Rich text editor for Notes tab
   - Searchable transcript with speaker highlighting
   - Session persistence for user notes

### **Phase 4**: Polish & Optimization
7. **User Experience**
   - Error handling and loading states
   - Accessibility compliance (WCAG AA)
   - Performance optimization (memoization, lazy loading)

8. **Testing & Documentation**
   - Component testing with Jest/React Testing Library
   - Integration testing with backend APIs
   - User guide and technical documentation

This specification provides a comprehensive foundation for building a production-ready frontend that fully leverages all the backend capabilities we've implemented, with the two-section layout (speaker setup + Notion-like interface) and recording functionality as specified.