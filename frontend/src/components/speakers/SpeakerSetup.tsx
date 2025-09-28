import React, { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useSpeakers, useAppContext } from '../../context/AppContext'
import SpeakerCard from './SpeakerCard'
import MeetingControls from './MeetingControls'

const SpeakerSetup: React.FC = () => {
  const { speakers, addSpeaker, setupState } = useSpeakers()
  const { state } = useAppContext()
  const [newSpeakerName, setNewSpeakerName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddSpeaker = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSpeakerName.trim()) {
      addSpeaker(newSpeakerName.trim())
      setNewSpeakerName('')
      setShowAddForm(false)
    }
  }

  const canStartMeeting = speakers.length > 0 &&
    speakers.some(speaker => speaker.voice_sample) &&
    !state.recording.isRecording

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-gray-600" />
          <h1 className="text-title font-bold text-gray-900">
            Speaker Setup
          </h1>
        </div>

        {setupState !== 'empty' && (
          <div className="text-sm text-gray-500">
            {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} added
          </div>
        )}
      </div>

      {/* Empty State */}
      {setupState === 'empty' && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No speakers added yet
          </h3>
          <p className="text-gray-500 mb-6">
            Add speakers and their voice samples to identify who's talking in your meeting.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Speaker
          </button>
        </div>
      )}

      {/* Speaker List */}
      {speakers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Speakers</h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-secondary text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Speaker
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {speakers.map((speaker) => (
              <SpeakerCard key={speaker.id} speaker={speaker} />
            ))}
          </div>
        </div>
      )}

      {/* Add Speaker Form */}
      {showAddForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <form onSubmit={handleAddSpeaker} className="flex gap-2">
            <input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              placeholder="Enter speaker name..."
              className="input-field flex-1"
              autoFocus
            />
            <button type="submit" className="btn-primary">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewSpeakerName('')
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Meeting Controls */}
      {speakers.length > 0 && (
        <MeetingControls canStartMeeting={canStartMeeting} />
      )}

      {/* Status Indicator */}
      {state.ui.isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            <div>
              <div className="font-medium text-blue-900">Processing Meeting</div>
              <div className="text-sm text-blue-700">{state.ui.processingStep || 'Please wait...'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.ui.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="font-medium text-red-900">Error</div>
          <div className="text-sm text-red-700 mt-1">{state.ui.error}</div>
        </div>
      )}
    </div>
  )
}

export default SpeakerSetup