import React from 'react'
import { FileText, Edit, MessageSquare, CheckSquare } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { TabType } from '../../types'

const TabNavigation: React.FC = () => {
  const { state, dispatch } = useAppContext()

  const tabs = [
    {
      id: 'summary' as TabType,
      name: 'Summary',
      icon: FileText,
      badge: null,
    },
    {
      id: 'notes' as TabType,
      name: 'Notes',
      icon: Edit,
      badge: null,
    },
    {
      id: 'transcript' as TabType,
      name: 'Transcript',
      icon: MessageSquare,
      badge: null,
    },
  ]

  const handleTabChange = (tabId: TabType) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId })
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-6">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const isActive = state.activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                    ? 'bg-gray-100 text-gray-900 border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>

                {tab.badge && (
                  <span className="ml-1 bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default TabNavigation