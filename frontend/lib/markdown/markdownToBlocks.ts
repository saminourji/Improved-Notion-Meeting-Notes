import { Block, HeadingBlock, ParagraphBlock, ListBlock, ListItemBlock, TodoBlock, QuoteBlock, CodeBlock, ThematicBreakBlock, TextSpan } from '@/types/blocks';

/**
 * Parse markdown text into Block objects
 */
export async function markdownToBlocks(markdown: string): Promise<Block[]> {
  if (!markdown || markdown.trim().length === 0) {
    return [];
  }

  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2];
      blocks.push({
        type: 'heading',
        level,
        children: [{ text }]
      });
      i++;
      continue;
    }

    // Handle thematic breaks
    if (line.match(/^-{3,}$|^\*{3,}$|^_{3,}$/)) {
      blocks.push({ type: 'thematicBreak' });
      i++;
      continue;
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      let codeText = '';
      i++;
      
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeText += lines[i] + '\n';
        i++;
      }
      
      blocks.push({
        type: 'code',
        language: language || undefined,
        text: codeText.trim()
      });
      i++;
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      const quoteChildren: Block[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        const text = lines[i].slice(1).trim();
        if (text) {
          quoteChildren.push({
            type: 'paragraph',
            children: [{ text }]
          });
        }
        i++;
      }
      
      if (quoteChildren.length > 0) {
        blocks.push({
          type: 'quote',
          children: quoteChildren
        });
      }
      continue;
    }

    // Handle lists and todos
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const [, indent, marker, text] = listMatch;
      const isOrdered = /^\d+\.$/.test(marker);
      const isTodo = text.startsWith('[ ]') || text.startsWith('[x]');
      
      const listItems: ListItemBlock[] = [];
      
      // Parse current item
      if (isTodo) {
        const checked = text.startsWith('[x]');
        const todoText = text.slice(3).trim();
        blocks.push({
          type: 'todo',
          checked,
          children: [{ text: todoText }]
        });
      } else {
        listItems.push({
          type: 'listItem',
          children: [{
            type: 'paragraph',
            children: [{ text }]
          }]
        });
        
        // Parse subsequent items at same indentation level
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.trim() === '') {
            i++;
            continue;
          }
          
          const nextMatch = nextLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
          if (!nextMatch) break;
          
          const [, nextIndent, nextMarker, nextText] = nextMatch;
          if (nextIndent.length !== indent.length) break;
          
          const isNextOrdered = /^\d+\.$/.test(nextMarker);
          const isNextTodo = nextText.startsWith('[ ]') || nextText.startsWith('[x]');
          
          if (isNextTodo) {
            // Todo item - add as separate block
            const checked = nextText.startsWith('[x]');
            const todoText = nextText.slice(3).trim();
            blocks.push({
              type: 'todo',
              checked,
              children: [{ text: todoText }]
            });
          } else {
            listItems.push({
              type: 'listItem',
              children: [{
                type: 'paragraph',
                children: [{ text: nextText }]
              }]
            });
          }
          i++;
        }
        
        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            ordered: isOrdered,
            children: listItems
          });
        }
      }
      continue;
    }

    // Handle regular paragraphs
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && 
           !lines[i].match(/^(#{1,3})\s+/) && 
           !lines[i].match(/^-{3,}$|^\*{3,}$|^_{3,}$/) &&
           !lines[i].startsWith('```') &&
           !lines[i].startsWith('>') &&
           !lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/)) {
      paragraphLines.push(lines[i]);
      i++;
    }
    
    if (paragraphLines.length > 0) {
      const text = paragraphLines.join(' ');
      blocks.push({
        type: 'paragraph',
        children: [{ text }]
      });
    }
  }

  return blocks;
}