"use client";

import React from "react";
import { formatSeconds } from "@/lib/utils";
import { apiService, SpeakerConfig } from "@/lib/api";

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

// Cache for speaker data to avoid repeated API calls
let speakersCache: SpeakerConfig[] | null = null;
let speakersCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get speakers data with caching
 */
async function getSpeakersWithCache(): Promise<SpeakerConfig[]> {
  const now = Date.now();
  if (speakersCache && (now - speakersCacheTime) < CACHE_DURATION) {
    return speakersCache;
  }
  
  try {
    speakersCache = await apiService.getSpeakers();
    speakersCacheTime = now;
    return speakersCache;
  } catch (error) {
    console.error('Failed to load speakers:', error);
    return speakersCache || [];
  }
}

/**
 * Speaker badge component with profile picture
 * Renders a neutral grey pill (same grey as @Today) with avatar + username
 */
const SpeakerBadge: React.FC<{ speakerName: string }> = ({ speakerName }) => {
  const [speaker, setSpeaker] = React.useState<SpeakerConfig | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadSpeaker = async () => {
      try {
        const speakers = await getSpeakersWithCache();
        const foundSpeaker = speakers.find(s => s.name === speakerName);
        setSpeaker(foundSpeaker || null);
      } catch (error) {
        console.error('Error loading speaker:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpeaker();
  }, [speakerName]);

  // Consistent neutral styling matching the @Today grey (#9B9B9B)
  const pillClass = "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium text-[#9B9B9B] border border-[#9B9B9B]/40";

  if (isLoading) {
    // Show loading state with just the name
    return (
      <span className={pillClass}>
        {speakerName}
      </span>
    );
  }

  if (speaker && speaker.metadata?.profilePhoto) {
    // Show speaker with profile picture
    return (
      <span className={pillClass}>
        <img
          src={speaker.metadata.profilePhoto}
          alt={speaker.name}
          className="w-4 h-4 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/Notion_AI_Face.png';
          }}
        />
        {speakerName}
      </span>
    );
  }

  // Fallback to badge with default Notion AI face
  return (
    <span className={pillClass}>
      <img
        src={'/Notion_AI_Face.png'}
        alt={speakerName}
        className="w-4 h-4 rounded-full object-cover"
      />
      {speakerName}
    </span>
  );
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
            <SpeakerBadge speakerName={segment.speaker} />
            <span className="text-sm text-gray-900 dark:text-gray-100 ml-2">
              {segment.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};