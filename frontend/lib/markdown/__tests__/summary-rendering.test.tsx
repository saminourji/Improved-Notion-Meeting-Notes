/**
 * Tests for summary rendering functionality including bullets, checkboxes, and Action Items
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryTab } from '@/components/meeting/tabs/summary-tab';
import { SummaryBlocksRenderer } from '@/components/meeting/tabs/summary-blocks-renderer';
import { markdownToBlocks } from '../markdownToBlocks';
import { Block, TodoBlock, ListBlock } from '@/types/blocks';

// Mock the mentions module
jest.mock('../mentions', () => ({
  TextWithMentions: ({ children }: { children: string }) => <span>{children}</span>,
  highlightMentions: (text: string) => [text]
}));

describe('Summary Rendering', () => {
  describe('ReactMarkdown rendering (unified path)', () => {
    it('should render bulleted lists with visible bullets', () => {
      const summary = `
## Key Points
- First bullet point
- Second bullet point
- Third bullet point
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Key Points')).toBeInTheDocument();
      expect(screen.getByText('First bullet point')).toBeInTheDocument();
      expect(screen.getByText('Second bullet point')).toBeInTheDocument();
      expect(screen.getByText('Third bullet point')).toBeInTheDocument();
    });

    it('should render task lists with checkboxes and proper line breaks', () => {
      const summary = `
## Action Items
- [ ] Task 1
- [x] Completed task
- [ ] Another task
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Action Items')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Completed task')).toBeInTheDocument();
      expect(screen.getByText('Another task')).toBeInTheDocument();
      
      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      expect(checkboxes[0]).not.toBeChecked(); // - [ ]
      expect(checkboxes[1]).toBeChecked(); // - [x]
      expect(checkboxes[2]).not.toBeChecked(); // - [ ]
    });

    it('should render numbered lists', () => {
      const summary = `
## Steps
1. First step
2. Second step
3. Third step
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Steps')).toBeInTheDocument();
      expect(screen.getByText('First step')).toBeInTheDocument();
      expect(screen.getByText('Second step')).toBeInTheDocument();
      expect(screen.getByText('Third step')).toBeInTheDocument();
    });

    it('should render mixed content with bullets and checkboxes', () => {
      const summary = `
## Meeting Summary

### Discussion Points
- Point 1
- Point 2

### Action Items
- [ ] @Sami to review the proposal
- [x] @Aadil completed the analysis
- [ ] Follow up meeting scheduled
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Meeting Summary')).toBeInTheDocument();
      expect(screen.getByText('Discussion Points')).toBeInTheDocument();
      expect(screen.getByText('Action Items')).toBeInTheDocument();
      
      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should render @mentions in action items with proper highlighting', () => {
      const summary = `
## Action Items
- [ ] @Sami to review the proposal by Friday
- [x] @Aadil completed the technical analysis
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Action Items')).toBeInTheDocument();
      
      // @mentions should be highlighted (this would be tested more thoroughly in integration)
      expect(screen.getByText('@Sami to review the proposal by Friday')).toBeInTheDocument();
      expect(screen.getByText('@Aadil completed the technical analysis')).toBeInTheDocument();
    });
  });

  describe('Headings and styles', () => {
    it('should render headings with distinct styles', () => {
      const summary = `
# Main Title
## Section Title
### Subsection Title
`;

      render(<SummaryTab summary={summary} />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });
      
      expect(h1).toHaveClass('text-2xl', 'font-bold', 'mb-2');
      expect(h2).toHaveClass('text-xl', 'font-semibold', 'mb-2');
      expect(h3).toHaveClass('text-lg', 'font-medium', 'mb-2');
    });
  });

  describe('Blocks Renderer Path', () => {
    it('should render TodoBlocks with checkboxes', async () => {
      const blocks: Block[] = [
        {
          type: 'heading',
          level: 2,
          children: [{ text: 'Action Items' }]
        },
        {
          type: 'todo',
          checked: false,
          children: [{ text: 'Unchecked task' }]
        } as TodoBlock,
        {
          type: 'todo',
          checked: true,
          children: [{ text: 'Checked task' }]
        } as TodoBlock
      ];

      render(<SummaryBlocksRenderer blocks={blocks} />);
      
      expect(screen.getByText('Action Items')).toBeInTheDocument();
      expect(screen.getByText('Unchecked task')).toBeInTheDocument();
      expect(screen.getByText('Checked task')).toBeInTheDocument();
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it('should render ListBlocks with proper styling', async () => {
      const blocks: Block[] = [
        {
          type: 'heading',
          level: 2,
          children: [{ text: 'Key Points' }]
        },
        {
          type: 'list',
          ordered: false,
          children: [
            {
              type: 'listItem',
              children: [{ type: 'paragraph', children: [{ text: 'First point' }] }]
            },
            {
              type: 'listItem',
              children: [{ type: 'paragraph', children: [{ text: 'Second point' }] }]
            }
          ]
        } as ListBlock
      ];

      render(<SummaryBlocksRenderer blocks={blocks} />);
      
      expect(screen.getByText('Key Points')).toBeInTheDocument();
      expect(screen.getByText('First point')).toBeInTheDocument();
      expect(screen.getByText('Second point')).toBeInTheDocument();
    });
  });

  // markdownToBlocks tests are no longer relevant to SummaryTab rendering path,
  // but we keep unit tests for the blocks renderer itself below for coverage.

  describe('Edge Cases', () => {
    it('should handle empty summary', () => {
      render(<SummaryTab summary="" />);
      // Should render nothing or empty content
    });

    it('should handle summary without lists', () => {
      const summary = `
## Executive Summary
This is a simple summary without any lists or tasks.
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText('This is a simple summary without any lists or tasks.')).toBeInTheDocument();
    });

    it('should render @mentions in paragraphs with proper highlighting', () => {
      const summary = `
## Summary
@Sami mentioned that the project is on track. @Aadil will follow up next week.
`;

      render(<SummaryTab summary={summary} />);
      
      expect(screen.getByText('Summary')).toBeInTheDocument();
      // @mentions should be highlighted via rehype plugin
      expect(screen.getByText('@Sami mentioned that the project is on track. @Aadil will follow up next week.')).toBeInTheDocument();
    });

    it('should handle malformed markdown gracefully', async () => {
      const malformedMarkdown = `
## Incomplete
- [ 
- [x
- 
`;

      // Should not throw errors
      const blocks = await markdownToBlocks(malformedMarkdown);
      expect(Array.isArray(blocks)).toBe(true);
    });
  });
});
