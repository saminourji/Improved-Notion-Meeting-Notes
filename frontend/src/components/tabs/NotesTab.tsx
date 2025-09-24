import React, { useState, useEffect } from 'react'
import { Edit3, Save } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

const NotesTab: React.FC = () => {
  const { state, dispatch } = useAppContext()
  const [notes, setNotes] = useState(state.currentMeeting?.user_notes || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const currentNotes = state.currentMeeting?.user_notes || ''
    if (notes !== currentNotes) {
      setHasUnsavedChanges(true)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [notes, state.currentMeeting?.user_notes])

  const handleSave = () => {
    dispatch({ type: 'UPDATE_NOTES', payload: notes })
    setHasUnsavedChanges(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-gray-600" />
          <h2 className="section-header mb-0">Meeting Notes</h2>
        </div>

        {hasUnsavedChanges && (
          <button
            onClick={handleSave}
            className="btn-primary text-sm"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </button>
        )}
      </div>

      {/* Notes Editor */}
      <div className="border border-gray-200 rounded-lg">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your meeting notes here... Use Markdown for formatting.

Try:
# Headings
- Bullet points
1. Numbered lists
**Bold text**
*Italic text*
`Code snippets`

> Quotes

---

**Tip:** Press Cmd+S to save"
          className="w-full h-96 p-4 border-none resize-none focus:outline-none focus:ring-0"
          style={{ fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", Consolas, "Courier New", monospace' }}
        />
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          {hasUnsavedChanges ? (
            <span className="text-orange-600">Unsaved changes</span>
          ) : (
            <span className="text-green-600">All changes saved</span>
          )}
        </div>

        <div>
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘S</kbd> to save
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use this space for additional context, follow-ups, or personal thoughts</li>
          <li>• These notes will be included when regenerating the AI summary</li>
          <li>• Supports Markdown formatting for better organization</li>
          <li>• Notes are automatically saved to your browser session</li>
        </ul>
      </div>
    </div>
  )
}

export default NotesTab