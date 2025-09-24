import { AppProvider } from './context/AppContext'
import SpeakerSetup from './components/speakers/SpeakerSetup'
import MeetingInterface from './components/layout/MeetingInterface'
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="min-h-screen bg-white">
          {/* Two-section layout as specified */}
          <div className="max-w-7xl mx-auto">

            {/* Top Section: Speaker Setup */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="p-6">
                <SpeakerSetup />
              </div>
            </div>

            {/* Bottom Section: Notion-like Meeting Interface */}
            <div className="bg-white">
              <MeetingInterface />
            </div>

          </div>
        </div>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App