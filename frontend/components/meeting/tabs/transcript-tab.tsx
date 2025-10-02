"use client";

import React from "react";
import { formatSeconds } from "@/lib/utils";

interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  matched_speaker?: string;
  text: string;
}

interface TranscriptTabProps {
  transcript: TranscriptSegment[];
}

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
  // Normalize and process transcript segments
  const processedTranscript = React.useMemo(() => {
    if (!transcript || transcript.length === 0) return [];
    
    // Filter out empty segments and normalize data
    const cleaned = transcript
      .filter(segment => segment && (segment.text || '').trim().length > 0)
      .map(segment => ({
        ...segment,
        text: (segment.text || '').trim(),
        speaker: segment.matched_speaker || segment.speaker
      }))
      .sort((a, b) => a.start - b.start);
    
    // Merge consecutive segments for the same speaker with gaps < 1.5s
    const merged = [];
    for (const segment of cleaned) {
      const lastSegment = merged[merged.length - 1];
      
      if (lastSegment && 
          lastSegment.speaker === segment.speaker && 
          (segment.start - lastSegment.end) < 1.5) {
        // Merge with previous segment
        lastSegment.end = segment.end;
        lastSegment.text += ' ' + segment.text;
      } else {
        merged.push({ ...segment });
      }
    }
    
    return merged;
  }, [transcript]);

  if (processedTranscript.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No transcript segments available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {processedTranscript.map((segment, index) => (
        <div key={index} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
          <div 
            className="text-xs text-gray-500 dark:text-gray-400 font-mono min-w-[3rem]"
            title={`${segment.start.toFixed(1)}s`}
          >
            {formatSeconds(segment.start)}
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


