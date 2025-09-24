import React from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppContext } from '../../context/AppContext'
import { CheckSquare, Square, User, Clock } from 'lucide-react'
import { ActionItem } from '../../types'

const SummaryTab: React.FC = () => {
  const { state } = useAppContext()

  if (state.ui.isProcessing) {
    return (
      <div className="space-y-6">
        <ProcessingState />
      </div>
    )
  }

  if (!state.currentMeeting?.summary && !state.currentMeeting?.action_items) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Summary Available
          </h3>
          <p className="text-gray-600">
            Process a meeting to see the AI-generated summary and action items.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-none">
      {/* Meeting Summary */}
      {state.currentMeeting?.summary && (
        <SummarySection summary={state.currentMeeting.summary.summary} />
      )}

      {/* Action Items */}
      {state.currentMeeting?.action_items && (
        <ActionItemsSection
          actionItems={state.currentMeeting.action_items}
          speakers={state.speakers}
        />
      )}
    </div>
  )
}

const ProcessingState: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Processing Header */}
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Analyzing Meeting
        </h3>
        <p className="text-gray-600">
          AI is processing your meeting to generate insights...
        </p>
      </div>

      {/* Processing Steps */}
      <div className="space-y-4">
        {[
          'Transcribing audio...',
          'Identifying speakers...',
          'Generating summary...',
          'Extracting action items...',
        ].map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-pulse" />
            <span className="text-gray-600">{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SummarySectionProps {
  summary: string
}

const SummarySection: React.FC<SummarySectionProps> = ({ summary }) => {
  return (
    <div className="prose prose-gray max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-title font-bold text-gray-900 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-section font-semibold text-gray-900 mb-3 mt-6">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="body-text mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="body-text">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  )
}

interface ActionItemsSectionProps {
  actionItems: any // ActionItemsResult
  speakers: any[] // SpeakerConfig[]
}

const ActionItemsSection: React.FC<ActionItemsSectionProps> = ({
  actionItems,
  speakers
}) => {
  // Determine if we should show "Your Action Items" or "Action Items"
  const speakerNames = speakers.map(s => s.name.toLowerCase())
  const participants = actionItems.general_view?.map((item: ActionItem) =>
    item.assignee?.toLowerCase()
  ).filter(Boolean) || []

  const hasUserSpeaker = participants.some(p => speakerNames.includes(p))
  const sectionTitle = hasUserSpeaker ? "Your Action Items" : "Action Items"

  // Choose which view to display
  let itemsToShow = actionItems.general_view || []

  // If only one speaker configured and they have a personalized view, show that
  if (speakers.length === 1 && actionItems.speaker_views?.[speakers[0].name]) {
    itemsToShow = actionItems.speaker_views[speakers[0].name]
  }

  if (!itemsToShow.length) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="section-header">{sectionTitle}</h2>

      <div className="space-y-3">
        {itemsToShow.map((item: ActionItem, index: number) => (
          <ActionItemCard key={index} item={item} />
        ))}
      </div>

      {/* Metadata */}
      {actionItems.metadata && (
        <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Generated using {actionItems.metadata.total_tokens_used || 0} tokens
          {actionItems.metadata.total_views > 1 && (
            <span> • {actionItems.metadata.total_views} personalized views created</span>
          )}
        </div>
      )}
    </div>
  )
}

interface ActionItemCardProps {
  item: ActionItem
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({ item }) => {
  const [isCompleted, setIsCompleted] = React.useState(item.completed || false)

  const handleToggle = () => {
    setIsCompleted(!isCompleted)
    // TODO: Persist completion state
  }

  const priorityColors = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-green-600 bg-green-50 border-green-200',
  }

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`mt-0.5 p-0.5 rounded transition-colors ${
            isCompleted
              ? 'text-primary-600 hover:text-primary-700'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {isCompleted ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${
            isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
          }`}>
            {item.task}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            {item.assignee && (
              <div className="flex items-center gap-1 text-gray-600">
                <User className="h-3 w-3" />
                <span>{item.assignee}</span>
              </div>
            )}

            {item.deadline && (
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{item.deadline}</span>
              </div>
            )}

            {item.priority && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                priorityColors[item.priority]
              }`}>
                {item.priority} priority
              </span>
            )}

            {item.relevance === 'primary' && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                Your responsibility
              </span>
            )}
          </div>

          {/* Context */}
          {item.context && (
            <div className="mt-2 text-sm text-gray-600 italic">
              {item.context}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SummaryTab