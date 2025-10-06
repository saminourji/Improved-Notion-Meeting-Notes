import React from 'react';

/**
 * Highlight speaker mentions in text
 */
export function highlightMentions(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split by @mentions
  const parts = text.split(/(\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b)/);
  
  return parts.map((part, index) => {
    if (part.match(/^\B@[A-Za-z][A-Za-z0-9_.-]{0,63}\b$/)) {
      // @mention - style it with grey color and semi-bold weight
      return React.createElement(
        'span',
        {
          key: index,
          style: { color: '#9B9B9B', fontWeight: 600 }
        },
        part
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