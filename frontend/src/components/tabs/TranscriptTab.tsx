import React, { useState, useMemo } from 'react'
import { Search, Copy, ChevronDown, ChevronRight, Clock, User } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { TranscriptSegment } from '../../types'

const TranscriptTab: React.FC = () => {
  const { state } = useAppContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set())

  const transcript = state.currentMeeting?.transcription

  if (!transcript) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Transcript Available
          </h3>
          <p className="text-gray-600">
            Process a meeting to see the full transcript with speaker identification.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <TranscriptHeader
        transcript={transcript}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Transcript Content */}
      <TranscriptContent
        transcript={transcript}
        searchQuery={searchQuery}
        expandedSpeakers={expandedSpeakers}
        onToggleExpanded={setExpandedSpeakers}
      />
    </div>
  )
}

interface TranscriptHeaderProps {
  transcript: any // TranscriptionResult
  searchQuery: string
  onSearchChange: (query: string) => void
}

const TranscriptHeader: React.FC<TranscriptHeaderProps> = ({
  transcript,
  searchQuery,
  onSearchChange
}) => {
  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript.full_text)
    // TODO: Show toast notification
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(transcript.duration || 0)} duration</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>{transcript.participants?.length || 0} speakers identified</span>
        </div>
        <div>
          {transcript.full_text?.split(' ').length || 0} words
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search transcript..."
            className="input-field pl-9 w-full"
          />
        </div>

        <button
          onClick={handleCopyTranscript}
          className="btn-secondary"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Transcript
        </button>
      </div>
    </div>
  )
}

interface TranscriptContentProps {
  transcript: any // TranscriptionResult
  searchQuery: string
  expandedSpeakers: Set<string>
  onToggleExpanded: (expanded: Set<string>) => void
}

const TranscriptContent: React.FC<TranscriptContentProps> = ({
  transcript,
  searchQuery,
  expandedSpeakers,
  onToggleExpanded
}) => {
  // Group segments by speaker
  const groupedSegments = useMemo(() => {
    if (!transcript.segments) return []

    const groups: { speaker: string; segments: TranscriptSegment[] }[] = []
    let currentGroup: { speaker: string; segments: TranscriptSegment[] } | null = null

    transcript.segments.forEach((segment: TranscriptSegment) => {
      const speaker = segment.matched_speaker || segment.speaker || 'Unknown'

      if (!currentGroup || currentGroup.speaker !== speaker) {
        currentGroup = { speaker, segments: [segment] }
        groups.push(currentGroup)
      } else {
        currentGroup.segments.push(segment)
      }
    })

    return groups
  }, [transcript.segments])

  // Filter by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedSegments

    const query = searchQuery.toLowerCase()
    return groupedSegments
      .map(group => ({
        ...group,
        segments: group.segments.filter(segment =>
          segment.text?.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.segments.length > 0)
  }, [groupedSegments, searchQuery])

  const toggleSpeakerExpanded = (speaker: string) => {
    const newExpanded = new Set(expandedSpeakers)
    if (newExpanded.has(speaker)) {
      newExpanded.delete(speaker)
    } else {
      newExpanded.add(speaker)
    }
    onToggleExpanded(newExpanded)
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? 'No matches found for your search.' : 'No transcript segments available.'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredGroups.map((group, groupIndex) => {
        const isExpanded = expandedSpeakers.has(group.speaker)
        const segmentsToShow = isExpanded ? group.segments : group.segments.slice(0, 3)
        const hasMore = group.segments.length > 3

        return (
          <div key={groupIndex} className="border border-gray-200 rounded-lg">
            {/* Speaker Header */}
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSpeakerExpanded(group.speaker)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {hasMore ? (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                </div>
                <h3 className="font-medium text-gray-900">{group.speaker}</h3>
              </div>
              <div className="text-sm text-gray-500">
                {group.segments.length} segment{group.segments.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Segments */}
            <div className="divide-y divide-gray-100">
              {segmentsToShow.map((segment, segmentIndex) => (
                <TranscriptSegmentCard
                  key={segmentIndex}
                  segment={segment}
                  searchQuery={searchQuery}
                  highlightText={highlightText}
                />
              ))}
            </div>

            {/* Show More Button */}
            {hasMore && !isExpanded && (
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => toggleSpeakerExpanded(group.speaker)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Show {group.segments.length - 3} more segments
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface TranscriptSegmentCardProps {
  segment: TranscriptSegment
  searchQuery: string
  highlightText: (text: string, query: string) => React.ReactNode
}

const TranscriptSegmentCard: React.FC<TranscriptSegmentCardProps> = ({
  segment,
  searchQuery,
  highlightText
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 caption-text text-gray-500 mt-1">
          {formatTime(segment.start)}
        </div>

        <div className="flex-1">
          <div className="body-text">
            {highlightText(segment.text || '', searchQuery)}
          </div>

          {/* Metadata */}
          {segment.similarity_score !== undefined && (
            <div className="mt-2 text-xs text-gray-500">
              Speaker match confidence: {Math.round(segment.similarity_score * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TranscriptTab