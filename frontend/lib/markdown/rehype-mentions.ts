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
      
      // Check if text contains @mentions
      const mentionRegex = /\B@([A-Za-z][A-Za-z0-9_.-]{0,63})\b/g;
      if (!mentionRegex.test(text)) return;
      
      // Split text and create new nodes
      const parts = text.split(mentionRegex);
      const newNodes: any[] = [];
      
      parts.forEach((part, partIndex) => {
        if (part.match(/^@[A-Za-z][A-Za-z0-9_.-]{0,63}$/)) {
          // @mention
          newNodes.push({
            type: 'element',
            tagName: 'span',
            properties: {
              style: 'color: #9B9B9B; font-weight: 600;'
            },
            children: [{ type: 'text', value: part }] // Keep @ symbol in display
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
      if (newNodes.length > 0 && parent) {
        parent.children.splice(index!, 1, ...newNodes);
      }
    });
  };
}