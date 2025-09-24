import React from 'react'
import { useAppContext } from '../../context/AppContext'
import Header from './Header'
import TabNavigation from './TabNavigation'
import SummaryTab from '../tabs/SummaryTab'
import NotesTab from '../tabs/NotesTab'
import TranscriptTab from '../tabs/TranscriptTab'

const MeetingInterface: React.FC = () => {
  const { state } = useAppContext()

  // Don't show interface until we have a meeting or are processing
  const shouldShow = state.currentMeeting || state.ui.isProcessing

  if (!shouldShow) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Start
            </h2>
            <p className="text-gray-600">
              Add speakers and their voice samples above, then record or upload a meeting to see the analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Header />

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      <div className="p-6">
        {state.activeTab === 'summary' && <SummaryTab />}
        {state.activeTab === 'notes' && <NotesTab />}
        {state.activeTab === 'transcript' && <TranscriptTab />}
      </div>
    </div>
  )
}

export default MeetingInterface