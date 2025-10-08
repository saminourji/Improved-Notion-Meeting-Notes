"use client";

import React from "react";
import { isMeetingProcessing } from "@/lib/utils";
import { BlockNoteSummaryRenderer } from "./blocknote-summary-renderer";

interface SummaryTabProps {
  summary: string;
  isProcessing?: boolean;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary, isProcessing }) => {
  if (isProcessing || !summary || summary.trim().length === 0) {
    return null;
  }

  return (
    <div>
      <BlockNoteSummaryRenderer summary={summary} />
    </div>
  );
};