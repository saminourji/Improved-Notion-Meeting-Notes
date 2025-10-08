"use client";

import * as React from 'react';
import { BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/react';
import '@blocknote/core/style.css';
import './blocknote-overrides.css';

interface BlockNoteSummaryRendererProps {
  summary: string;
}

export const BlockNoteSummaryRenderer: React.FC<BlockNoteSummaryRendererProps> = ({ summary }) => {
  const [blocks, setBlocks] = React.useState<any[]>([]);

  // Parse markdown to BlockNote blocks
  React.useEffect(() => {
    const parseMarkdown = async () => {
      if (!summary || summary.trim().length === 0) {
        setBlocks([]);
        return;
      }

      try {
        // Create a temporary editor to parse markdown
        const tempEditor = BlockNoteEditor.create({
          initialContent: undefined,
        });

        // Parse markdown to blocks
        const parsedBlocks = await tempEditor.tryParseMarkdownToBlocks(summary);
        setBlocks(parsedBlocks);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setBlocks([]);
      }
    };

    parseMarkdown();
  }, [summary]);

  // Create editor instance with read-only configuration
  const editor = React.useMemo(() => {
    return BlockNoteEditor.create({
      initialContent: blocks,
      editable: false,
    });
  }, [blocks]);

  return (
    <div className="blocknote-summary-container">
      <BlockNoteView 
        editor={editor}
        className="blocknote-readonly"
      />
    </div>
  );
};