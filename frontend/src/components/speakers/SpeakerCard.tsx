import React, { useState, useRef } from 'react'
import { User, Upload, Trash2, Check, X } from 'lucide-react'
import { useSpeakers, useRecording } from '../../context/AppContext'
import type { SpeakerConfig } from '../../types'
import AudioRecorder from '../recording/AudioRecorder'

interface SpeakerCardProps {
  speaker: SpeakerConfig
}

const SpeakerCard: React.FC<SpeakerCardProps> = ({ speaker }) => {
  const { updateSpeaker, removeSpeaker } = useSpeakers()
  const { recording } = useRecording()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(speaker.name)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveName = () => {
    if (editName.trim() && editName !== speaker.name) {
      updateSpeaker(speaker.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditName(speaker.name)
    setIsEditing(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      updateSpeaker(speaker.id, {
        voice_sample: file,
        sample_type: 'uploaded'
      })
    }
  }

  const handleRecordingComplete = (audioBlob: Blob) => {
    updateSpeaker(speaker.id, {
      voice_sample: audioBlob,
      sample_type: 'recorded'
    })
  }

  const isRecordingForThis = recording.isRecording &&
    recording.recordingType === 'voice_sample' &&
    recording.targetSpeakerId === speaker.id

  const hasSample = !!speaker.voice_sample

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-colors ${
      hasSample ? 'border-green-200 bg-green-50' : 'border-gray-200'
    }`}>
      {/* Speaker Name */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-field text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') handleCancelEdit()
              }}
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <User className="h-4 w-4 text-gray-500" />
            <span
              className="font-medium text-gray-900 cursor-pointer hover:text-primary-600"
              onClick={() => setIsEditing(true)}
            >
              {speaker.name}
            </span>
          </div>
        )}

        <button
          onClick={() => removeSpeaker(speaker.id)}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Voice Sample Status */}
      <div className="mb-4">
        {hasSample ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <Check className="h-4 w-4" />
              <span>
                {speaker.sample_type === 'recorded' ? 'Recorded' : 'Uploaded'} sample
              </span>
            </div>
            <button
              onClick={() => updateSpeaker(speaker.id, { voice_sample: undefined })}
              className="text-gray-400 hover:text-red-500 text-xs"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No voice sample yet
          </div>
        )}
      </div>

      {/* Recording/Upload Controls */}
      {!hasSample && (
        <div className="space-y-3">
          {/* Record Voice Sample */}
          <AudioRecorder
            type="voice_sample"
            targetSpeakerId={speaker.id}
            maxDuration={60}
            onRecordingComplete={handleRecordingComplete}
            isActive={isRecordingForThis}
          />

          {/* Upload Alternative */}
          <div className="flex items-center justify-center">
            <span className="text-xs text-gray-400">or</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-secondary text-sm"
            disabled={isRecordingForThis}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Audio File
          </button>
        </div>
      )}

      {/* Re-record option if sample exists */}
      {hasSample && (
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => updateSpeaker(speaker.id, { voice_sample: undefined })}
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            Record new sample
          </button>
        </div>
      )}
    </div>
  )
}

export default SpeakerCard