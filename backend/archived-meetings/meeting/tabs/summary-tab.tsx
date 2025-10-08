"use client";

import React from "react";
import { isMeetingProcessing } from "@/lib/utils";
import { SummaryBlocksRenderer } from "./summary-blocks-renderer";
import { markdownToBlocks } from "@/lib/markdown/markdownToBlocks";

interface SummaryTabProps {
  summary: string;
  isProcessing?: boolean;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary, isProcessing }) => {
  const [blocks, setBlocks] = React.useState<any[]>([]);

  React.useEffect(() => {
    const parseSummary = async () => {
      if (!summary || summary.trim().length === 0) {
        setBlocks([]);
        return;
      }
      
      try {
        const parsedBlocks = await markdownToBlocks(summary);
        setBlocks(parsedBlocks);
      } catch (error) {
        console.error('Error parsing summary:', error);
        setBlocks([]);
      }
    };

    parseSummary();
  }, [summary]);

  if (isProcessing || !summary || summary.trim().length === 0) {
    return null;
  }

  return (
    <div>
      <SummaryBlocksRenderer blocks={blocks} />
    </div>
  );
};