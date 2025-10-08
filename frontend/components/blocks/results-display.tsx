"use client";

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Clock, 
  Users,
  Play,
  Pause,
  Copy,
  Download
} from 'lucide-react';
import { formatSeconds } from "@/lib/utils";
import { highlightMentionsSimple } from '@/lib/markdown/mentions';

interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  completed: boolean;
}

interface ResultsDisplayProps {
  transcript: TranscriptSegment[];
  summary: string;
  actionItems: ActionItem[];
  participants: string[];
  duration: number;
  showResults: boolean;
  onToggleResults: () => void;
}

export const ResultsDisplay = ({
  transcript,
  summary,
  actionItems,
  participants,
  duration,
  showResults,
  onToggleResults
}: ResultsDisplayProps) => {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    actionItems: true
  });

  const [isPlaying, setIsPlaying] = useState(false);

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  // transcript color helpers removed; transcript moved to TranscriptTab

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!showResults) {
    return (
      <button
        onClick={onToggleResults}
        className="flex items-center gap-2 p-3 w-full text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
        <FileText className="w-4 h-4" />
        <span className="font-medium">View Meeting Results</span>
        <span className="text-sm text-gray-500">({participants.length} participants, {formatSeconds(duration)})</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <button
        onClick={onToggleResults}
        className="flex items-center gap-2 p-3 w-full text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
        <FileText className="w-4 h-4" />
        <span className="font-medium">Meeting Results</span>
        <span className="text-sm text-gray-500">({participants.length} participants, {formatSeconds(duration)})</span>
      </button>

      {/* Meeting Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            Duration
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatSeconds(duration)}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Users className="w-4 h-4" />
            Participants
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {participants.length} people
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <CheckSquare className="w-4 h-4" />
            Action Items
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {actionItems.length} items
          </div>
        </div>
      </div>

      {/* Audio Playback Controls */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="text-sm text-blue-700 dark:text-blue-300">
          {isPlaying ? 'Playing meeting audio...' : 'Click to play meeting audio'}
        </span>
      </div>

      {/* Summary Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => toggleSection('summary')}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.summary ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <MessageSquare className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(summary);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <Copy className="w-4 h-4" />
          </button>
        </button>
        
        {expandedSections.summary && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm leading-relaxed">
              {highlightMentionsSimple(summary)}
            </div>
          </div>
        )}
      </div>

      {/* Action Items Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => toggleSection('actionItems')}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.actionItems ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CheckSquare className="w-4 h-4" />
            <span className="font-medium">Action Items ({actionItems.length})</span>
          </div>
        </button>
        
        {expandedSections.actionItems && (
          <div className="px-4 pb-4">
            {actionItems.length > 0 ? (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {highlightMentionsSimple(item.text)}
                      </p>
                      {item.assignee && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Assigned to: {item.assignee}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-3">
                No action items identified in this meeting.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Transcript moved to dedicated TranscriptTab */}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
          📝 Create Follow-up Page
        </button>
        <button className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-sm hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
          📅 Add to Calendar
        </button>
        <button className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
          📤 Share Transcript
        </button>
      </div>
    </div>
  );
};
