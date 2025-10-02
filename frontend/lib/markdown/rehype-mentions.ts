import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

/**
 * Rehype plugin to transform speaker mentions in markdown
 */
export function rehypeMentions() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value || typeof node.value !== 'string') return;
      
      const text = node.value;
      
      // Check if text contains speaker mentions
      const mentionRegex = /(\([^)]+\)|\[[^\]]+\])/g;
      if (!mentionRegex.test(text)) return;
      
      // Split text and create new nodes
      const parts = text.split(mentionRegex);
      const newNodes: any[] = [];
      
      parts.forEach((part, partIndex) => {
        if (part.match(/^\([^)]+\)$/)) {
          // Speaker mention in parentheses
          const speakerName = part.slice(1, -1);
          newNodes.push({
            type: 'element',
            tagName: 'span',
            properties: {
              className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            },
            children: [{ type: 'text', value: speakerName }]
          });
        } else if (part.match(/^\[[^\]]+\]$/)) {
          // Speaker mention in brackets
          const speakerName = part.slice(1, -1);
          newNodes.push({
            type: 'element',
            tagName: 'span',
            properties: {
              className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            },
            children: [{ type: 'text', value: speakerName }]
          });
        } else if (part.length > 0) {
          // Regular text
          newNodes.push({
            type: 'text',
            value: part
          });
        }
      });
      
      // Replace the original text node with new nodes
      if (newNodes.length > 0) {
        parent.children.splice(index!, 1, ...newNodes);
      }
    });
  };
}