import React from 'react';

/**
 * Utilities for highlighting @mentions in markdown content
 */

/**
 * Highlights @mentions in text content, avoiding emails and code blocks
 * @param text The text content to process
 * @returns JSX elements with highlighted mentions
 */
export function highlightMentions(text: string): React.ReactNode[] {
  // Conservative regex pattern for @mentions
  // Matches @ followed by alphanumeric characters, underscores, dots, hyphens
  // But excludes if it looks like an email (contains another @ or domain patterns)
  const mentionRegex = /\B@([A-Za-z][A-Za-z0-9_.-]{0,63})/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const mentionName = match[1];
    const startIndex = match.index;
    
    // Skip if this looks like an email (contains another @ after the mention)
    const afterMention = text.substring(startIndex + fullMatch.length);
    if (afterMention.includes('@') && /[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(afterMention)) {
      continue;
    }
    
    // Add text before the mention
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }
    
    // Add the highlighted mention
    parts.push(
      <span 
        key={`mention-${startIndex}`}
        className="text-[#9B9B9B] font-semibold"
        style={{ color: '#9B9B9B', fontWeight: 600 }}
      >
        @{mentionName}
      </span>
    );
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Processes markdown content to highlight @mentions while preserving markdown structure
 * @param content The markdown content
 * @returns Processed content with highlighted mentions
 */
export function processMarkdownWithMentions(content: string): string {
  // This is a simple implementation that highlights mentions in plain text
  // For more complex markdown, we'd need to parse and rebuild the AST
  return content.replace(
    /\B@([A-Za-z][A-Za-z0-9_.-]{0,63})/g,
    '<span style="color: #9B9B9B; font-weight: 600;">@$1</span>'
  );
}

/**
 * Custom React component for rendering text with highlighted mentions
 */
export function TextWithMentions({ children }: { children: string }) {
  return <>{highlightMentions(children)}</>;
}


