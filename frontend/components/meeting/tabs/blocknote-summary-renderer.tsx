"use client";

import * as React from 'react';
import { BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/react';
import '@blocknote/core/style.css';

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
      <style jsx>{`
        .blocknote-readonly {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        
        .blocknote-readonly .bn-editor {
          padding: 0 !important;
          min-height: auto !important;
        }
        
        .blocknote-readonly .bn-block-content {
          margin: 0 !important;
        }
        
        /* Heading styles */
        .blocknote-readonly h1 {
          font-size: 1.875rem !important;
          font-weight: 700 !important;
          margin-bottom: 1rem !important;
          color: #111827 !important;
        }
        
        .blocknote-readonly h2 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          margin-bottom: 0.75rem !important;
          color: #111827 !important;
        }
        
        .blocknote-readonly h3 {
          font-size: 1.25rem !important;
          font-weight: 500 !important;
          margin-bottom: 0.5rem !important;
          color: #111827 !important;
        }
        
        /* Paragraph styles */
        .blocknote-readonly p {
          margin-bottom: 0.75rem !important;
          color: #1f2937 !important;
          line-height: 1.625 !important;
        }
        
        /* List styles */
        .blocknote-readonly ul {
          list-style-type: disc !important;
          margin-left: 1.5rem !important;
          margin-bottom: 1rem !important;
        }
        
        .blocknote-readonly ol {
          list-style-type: decimal !important;
          margin-left: 1.5rem !important;
          margin-bottom: 1rem !important;
        }
        
        .blocknote-readonly li {
          margin-bottom: 0.25rem !important;
          color: #1f2937 !important;
        }
        
        /* Strong and emphasis */
        .blocknote-readonly strong {
          font-weight: 600 !important;
          color: #111827 !important;
        }
        
        .blocknote-readonly em {
          font-style: italic !important;
          color: #1f2937 !important;
        }
        
        /* Checkbox styles */
        .blocknote-readonly input[type="checkbox"] {
          margin-right: 0.5rem !important;
          vertical-align: middle !important;
        }
      `}</style>
    </div>
  );
};