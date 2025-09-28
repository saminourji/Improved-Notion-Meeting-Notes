import React, { useRef } from 'react'
import { Upload } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import AudioRecorder from '../recording/AudioRecorder'
import { processMeeting, handleApiError } from '../../services/api'
import type { MeetingData } from '../../types'

interface MeetingControlsProps {
  canStartMeeting: boolean
}

const MeetingControls: React.FC<MeetingControlsProps> = ({ canStartMeeting }) => {
  const { state, dispatch } = useAppContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleMeetingRecordingComplete = async (audioBlob: Blob) => {
    // Create a File object from the Blob
    const meetingFile = new File([audioBlob], 'meeting-recording.webm', {
      type: 'audio/webm'
    })

    await processMeetingFile(meetingFile)
  }

  const handleMeetingFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await processMeetingFile(file)
    }
  }

  const processMeetingFile = async (audioFile: File) => {
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Prepare speaker data for API
      const speakerData = state.speakers.map(speaker => ({
        name: speaker.name,
        voiceSample: speaker.voice_sample
      })).filter(s => s.voiceSample) // Only include speakers with voice samples

      console.log('Processing meeting with speakers:', speakerData.map(s => s.name))

      // Call API
      const result = await processMeeting(audioFile, speakerData, {
        generateInsights: true,
        generateAllActionViews: true
      })

      if (result.success) {
        // Create meeting data
        const meetingData: MeetingData = {
          id: result.meeting_id,
          title: `Meeting ${new Date().toLocaleDateString()}`,
          status: 'completed',
          created_at: new Date().toISOString(),
          speakers: state.speakers,
          transcription: result.transcription,
          summary: result.summary,
          action_items: result.action_items,
          audio_file: audioFile
        }

        dispatch({ type: 'SET_MEETING', payload: meetingData })
      } else {
        throw new Error(result.error || 'Processing failed')
      }

    } catch (error) {
      console.error('Meeting processing error:', error)
      dispatch({ type: 'SET_ERROR', payload: handleApiError(error) })
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false })
    }
  }

  const isRecordingMeeting = state.recording.isRecording &&
    state.recording.recordingType === 'meeting'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="section-header mb-4">Record Meeting</h2>

      {!canStartMeeting && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            Add at least one speaker with a voice sample to start recording.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Record Meeting */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Record Live Meeting</h3>
          <p className="text-sm text-gray-600">
            Start recording and speak naturally. The system will identify speakers based on voice samples.
          </p>

          <AudioRecorder
            type="meeting"
            maxDuration={7200} // 2 hours max
            onRecordingComplete={handleMeetingRecordingComplete}
            isActive={isRecordingMeeting}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Upload Meeting */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Upload Meeting File</h3>
          <p className="text-sm text-gray-600">
            Upload an existing audio recording of your meeting.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleMeetingFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canStartMeeting || isRecordingMeeting}
            className="w-full btn-secondary"
          >
            <Upload className="h-5 w-5 mr-2" />
            Choose Audio File
          </button>
        </div>
      </div>

      {/* Processing Status */}
      {state.ui.isProcessing && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
            <span className="text-sm text-blue-800">
              Processing meeting... This may take a few minutes.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetingControls