import React from 'react';
import { apiService, SpeakerConfig } from '../api';

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
 * Enhanced speaker mention component with profile picture
 */
const SpeakerMention: React.FC<{ speakerName: string }> = ({ speakerName }) => {
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

  if (isLoading) {
    // Show loading state with just the name
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {speakerName}
      </span>
    );
  }

  if (speaker && speaker.metadata?.profilePhoto) {
    // Show speaker with profile picture
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
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

  // Fallback to mention with default Notion AI face
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      <img
        src={'/Notion_AI_Face.png'}
        alt={speakerName}
        className="w-4 h-4 rounded-full object-cover"
      />
      {speakerName}
    </span>
  );
};

/**
 * Highlight speaker mentions in text with profile pictures
 */
export function highlightMentions(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split by @mentions
  const parts = text.split(/(\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b)/);
  
  return parts.map((part, index) => {
    if (part.match(/^\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b$/)) {
      // Extract speaker name (remove @)
      const speakerName = part.substring(1);
      return <SpeakerMention key={index} speakerName={speakerName} />;
    } else {
      // Regular text
      return part;
    }
  });
}

/**
 * Simple speaker mention highlighting that matches @Today styling
 */
export function highlightMentionsSimple(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split by @mentions
  const parts = text.split(/(\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b)/);
  
  return parts.map((part, index) => {
    if (part.match(/^\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b$/)) {
      // Simple mention with same styling as @Today
      return (
        <span key={index} style={{ color: '#9B9B9B', fontWeight: 600 }}>
          {part}
        </span>
      );
    } else {
      // Regular text
      return part;
    }
  });
}

/**
 * Text component with mention highlighting
 */
export const TextWithMentions: React.FC<{ children: string }> = ({ children }) => {
  return React.createElement(React.Fragment, null, highlightMentions(children));
};
