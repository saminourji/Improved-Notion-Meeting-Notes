import React from 'react';

/**
 * Highlight speaker mentions in text
 */
export function highlightMentions(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split by speaker mentions (names in parentheses or brackets)
  const parts = text.split(/(\([^)]+\)|\[[^\]]+\])/);
  
  return parts.map((part, index) => {
    if (part.match(/^\([^)]+\)$/)) {
      // Speaker mention in parentheses - style it
      const speakerName = part.slice(1, -1);
      return React.createElement(
        'span',
        {
          key: index,
          className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        },
        speakerName
      );
    } else if (part.match(/^\[[^\]]+\]$/)) {
      // Speaker mention in brackets - style it differently
      const speakerName = part.slice(1, -1);
      return React.createElement(
        'span',
        {
          key: index,
          className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        },
        speakerName
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