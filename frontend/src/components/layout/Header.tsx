import React, { useState, useRef, useEffect } from 'react'
import { FileText, Sparkles, Settings, MoreHorizontal } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

const Header: React.FC = () => {
  const { state, dispatch } = useAppContext()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(
    state.currentMeeting?.title || 'Untitled Meeting'
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const title = state.currentMeeting?.title || 'Meeting Analysis'

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== title) {
      // TODO: Update meeting title
      console.log('Saving title:', editTitle)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Icon and Title */}
        <div className="flex items-center gap-3 flex-1">
          <FileText className="h-6 w-6 text-gray-600 flex-shrink-0" />

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              className="text-title font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded flex-1 min-w-0"
            />
          ) : (
            <h1
              onClick={() => setIsEditing(true)}
              className="text-title font-bold text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex-1 min-w-0 truncate"
              title={title}
            >
              {title}
            </h1>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Processing Status */}
          {state.ui.isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span>Processing...</span>
            </div>
          )}

          {/* AI Button */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="AI Actions"
            disabled={state.ui.isProcessing}
          >
            <Sparkles className="h-5 w-5" />
          </button>

          {/* Settings Button */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* More Options */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="More Options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Processing Step Details */}
      {state.ui.isProcessing && state.ui.processingStep && (
        <div className="mt-2 text-sm text-gray-600">
          {state.ui.processingStep}
        </div>
      )}

      {/* Error Display */}
      {state.ui.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {state.ui.error}
        </div>
      )}
    </div>
  )
}

export default Header