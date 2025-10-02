"use client";

import React, { useEffect, useState } from "react";
import { isMeetingProcessing } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownToBlocks } from "@/lib/markdown/markdownToBlocks";
import { SummaryBlocksRenderer } from "./summary-blocks-renderer";
import { TextWithMentions } from "@/lib/markdown/mentions";
import { rehypeMentions } from "@/lib/markdown/rehype-mentions";
import type { Block } from "@/types/blocks";

interface SummaryTabProps {
  summary: string;
  isProcessing?: boolean;
}

// Helper function to check if blocks contain lists or todos
function blocksContainListsOrTodos(blocks: Block[]): boolean {
  return blocks.some(block => 
    block.type === 'list' || 
    block.type === 'todo' ||
    (block.type === 'listItem' && (block as any).children?.some((child: any) => child.type === 'list'))
  );
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary, isProcessing }) => {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [useReactMarkdown, setUseReactMarkdown] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Always try to parse blocks first
        const b = await markdownToBlocks(summary || "");
        
        if (mounted && b && b.length > 0) {
          // If blocks contain lists/todos, use blocks renderer for better control
          if (blocksContainListsOrTodos(b)) {
            setBlocks(b);
            setUseReactMarkdown(false);
          } else {
            // For simple content without lists, use ReactMarkdown
            setBlocks([]);
            setUseReactMarkdown(true);
          }
        } else if (mounted) {
          setBlocks([]);
          setUseReactMarkdown(true);
        }
      } catch {
        if (mounted) {
          setBlocks([]);
          setUseReactMarkdown(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [summary]);

  if (isProcessing || !summary || summary.trim().length === 0) {
    return null;
  }

  return (
    <div>
      {!useReactMarkdown && blocks && blocks.length > 0 ? (
        <SummaryBlocksRenderer blocks={blocks} />
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeMentions]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-semibold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{typeof children === 'string' ? <TextWithMentions>{children}</TextWithMentions> : children}</li>,
            p: ({ children }) => <p className="mb-2">{typeof children === 'string' ? <TextWithMentions>{children}</TextWithMentions> : children}</p>,
            input: ({ checked, ...props }) => (
              <input 
                type="checkbox" 
                readOnly 
                checked={Boolean(checked)} 
                className="mr-2 align-middle" 
                {...props}
              />
            )
          }}
        >
          {summary}
        </ReactMarkdown>
      )}
    </div>
  );
};


