"use client";

import React from "react";

interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface TranscriptTabProps {
  transcript: TranscriptSegment[];
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getSpeakerColor = (speaker: string): string => {
  const colors = [
    'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
    'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  ];
  const hash = speaker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const TranscriptTab: React.FC<TranscriptTabProps> = ({ transcript }) => {
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {transcript.map((segment, index) => (
        <div key={index} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono min-w-[3rem]">
            {formatTime(segment.start)}
          </div>
          <div className="flex-1">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mr-2 ${getSpeakerColor(segment.speaker)}`}>
              {segment.speaker}
            </span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {segment.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranscriptTab;


