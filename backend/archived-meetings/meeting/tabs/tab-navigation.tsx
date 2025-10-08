"use client";

import React from "react";
import { isMeetingProcessing, hasSummary, type MeetingLikeData } from "@/lib/utils";

export type MeetingTab = "summary" | "notes" | "transcript";

interface TabNavigationProps {
  activeTab: MeetingTab;
  onTabChange: (tab: MeetingTab) => void;
  showTranscript: boolean;
  isCompleted?: boolean;
  isRecording?: boolean;
  isProcessing?: boolean;
  meetingData?: MeetingLikeData;
}

// Custom Icon component for dynamic coloring
const TabIcon: React.FC<{ src: string; alt: string; isActive: boolean }> = ({ src, alt, isActive }) => {
  const color = isActive ? "#1F1F1F" : "#6B7280";
  
  return (
    <div className="w-[18px] h-[18px] flex items-center justify-center">
      <img 
        src={src} 
        alt={alt}
        className="w-4 h-4"
        style={{ filter: `brightness(0) saturate(100%) ${isActive ? 'invert(13%) sepia(8%) saturate(1076%) hue-rotate(169deg) brightness(94%) contrast(86%)' : 'invert(43%) sepia(8%) saturate(1076%) hue-rotate(169deg) brightness(94%) contrast(86%)'}` }}
      />
    </div>
  );
};

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, showTranscript, isCompleted, isRecording, isProcessing, meetingData }) => {
  const processing = isMeetingProcessing(meetingData);
  const canShowSummary = !processing && (!!meetingData ? hasSummary(meetingData) || isCompleted : isCompleted);

  // Define tab order based on state:
  // 1. Before recording: [Notes]
  // 2. During recording/processing: [Notes, Transcript] (always shown)
  // 3. When completed: [Notes, Transcript] (Summary only appears when actually generated)
  // 4. When summary is generated: [Summary, Notes, Transcript]
  let tabs: MeetingTab[] = ["notes"];

  if (isRecording || isProcessing) {
    // During recording/processing: Always show Notes + Transcript
    tabs = ["notes", "transcript"];
  } else if (isCompleted) {
    // When completed: Only show Summary if it's actually been generated
    if (canShowSummary && showTranscript) {
      tabs = ["summary", "notes", "transcript"];
    } else if (canShowSummary) {
      tabs = ["summary", "notes"];
    } else if (showTranscript) {
      tabs = ["notes", "transcript"];
    } else {
      tabs = ["notes"];
    }
  }

  const btnClass = (tab: MeetingTab) =>
    `flex items-center justify-center gap-2 px-[11px] h-[33px] rounded-full cursor-pointer border-none text-sm font-medium transition-all duration-200 min-w-[80px] ${
      activeTab === tab 
        ? "bg-[#EFEEEA]" 
        : "bg-transparent hover:bg-[#F5F5F5]"
    }`;

  const renderIcon = (tab: MeetingTab) => {
    const isActive = activeTab === tab;
    if (tab === "notes") return <TabIcon src="/icons/note pencil.svg" alt="Notes" isActive={isActive} />;
    if (tab === "transcript") return <TabIcon src="/icons/transcript.svg" alt="Transcript" isActive={isActive} />;
    return <TabIcon src="/icons/summary checklist.svg" alt="Summary" isActive={isActive} />;
  };

  const renderLabel = (tab: MeetingTab) =>
    tab === "notes" ? "Notes" : tab === "summary" ? "Summary" : "Transcript";

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab, idx) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={btnClass(tab)}
          aria-pressed={activeTab === tab}
        >
          {renderIcon(tab)}
          <span className={`text-sm font-medium ${activeTab === tab ? "text-[#1F1F1F]" : "text-[#6B7280]"}`}>{renderLabel(tab)}</span>
        </button>
      ))}
    </div>
  );
};


