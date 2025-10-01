"use client";

import React from "react";
import { Edit3, FileText } from "lucide-react";

export type MeetingTab = "summary" | "notes" | "transcript";

interface TabNavigationProps {
  activeTab: MeetingTab;
  onTabChange: (tab: MeetingTab) => void;
  showTranscript: boolean;
  isCompleted?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, showTranscript, isCompleted }) => {
  const tabs: MeetingTab[] = isCompleted
    ? (showTranscript ? ["summary", "notes", "transcript"] as MeetingTab[] : ["summary", "notes"])
    : ["notes", "summary"];

  const btnClass = (tab: MeetingTab) =>
    `flex items-center gap-2 px-6 py-3 rounded-full cursor-pointer border-none ${
      activeTab === tab ? "bg-[#EFEEEA] font-semibold" : "bg-transparent"
    }`;

  const renderIcon = (tab: MeetingTab) => {
    if (tab === "notes") return <Edit3 size={18} strokeWidth={2} className="text-[#1F1F1F]" />;
    return <FileText size={18} strokeWidth={2} className="text-[#1F1F1F]" />;
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
          style={{ padding: '12px 24px' }}
        >
          {renderIcon(tab)}
          <span className="text-sm text-[#1F1F1F]">{renderLabel(tab)}</span>
        </button>
      ))}
    </div>
  );
};


