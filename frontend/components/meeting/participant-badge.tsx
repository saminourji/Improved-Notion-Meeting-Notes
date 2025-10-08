"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { apiService, SpeakerConfig } from '@/lib/api';

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

interface ParticipantBadgeProps {
  participantName: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

/**
 * Participant badge component with profile picture
 */
export const ParticipantBadge: React.FC<ParticipantBadgeProps> = ({ 
  participantName, 
  variant = "outline",
  className = "text-xs"
}) => {
  const [speaker, setSpeaker] = React.useState<SpeakerConfig | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadSpeaker = async () => {
      try {
        const speakers = await getSpeakersWithCache();
        const foundSpeaker = speakers.find(s => s.name === participantName);
        setSpeaker(foundSpeaker || null);
      } catch (error) {
        console.error('Error loading speaker:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpeaker();
  }, [participantName]);

  if (isLoading) {
    // Show loading state with just the name
    return (
      <Badge variant={variant} className={className}>
        {participantName}
      </Badge>
    );
  }

  if (speaker && speaker.metadata?.profilePhoto) {
    // Show participant with profile picture
    return (
      <Badge variant={variant} className={`${className} inline-flex items-center gap-1`}>
        <img
          src={speaker.metadata.profilePhoto}
          alt={speaker.name}
          className="w-3 h-3 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/Notion_AI_Face.png';
          }}
        />
        {participantName}
      </Badge>
    );
  }

  // Fallback to badge with default Notion AI face
  return (
    <Badge variant={variant} className={`${className} inline-flex items-center gap-1`}>
      <img
        src={'/Notion_AI_Face.png'}
        alt={participantName}
        className="w-3 h-3 rounded-full object-cover"
      />
      {participantName}
    </Badge>
  );
};
