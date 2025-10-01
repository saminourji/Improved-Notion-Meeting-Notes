"use client";

import React from "react";
import { Edit3, FileText } from "lucide-react";

export type MeetingTab = "summary" | "notes" | "transcript";

interface TabNavigationProps {
  activeTab: MeetingTab;
  onTabChange: (tab: MeetingTab) => void;
  showTranscript: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, showTranscript }) => {
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={() => onTabChange("notes")}
        className="flex items-center gap-3 h-[33px] px-3 bg-[#EFEEEA] border-none rounded-full cursor-pointer"
        aria-pressed={activeTab === "notes"}
      >
        <Edit3 size={18} strokeWidth={2} className="text-[#1F1F1F]" />
        <span className="text-sm font-medium text-[#1F1F1F]">Notes</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("summary")}
        className={`flex items-center gap-3 h-[33px] px-3 ml-2 border-none rounded-full cursor-pointer ${
          activeTab === "summary" ? "bg-[#EFEEEA]" : "bg-transparent"
        }`}
        aria-pressed={activeTab === "summary"}
      >
        <FileText size={18} strokeWidth={2} className="text-[#1F1F1F]" />
        <span className="text-sm font-medium text-[#1F1F1F]">Summary</span>
      </button>

      {showTranscript && (
        <button
          type="button"
          onClick={() => onTabChange("transcript")}
          className={`flex items-center gap-2 px-6 py-3 bg-transparent rounded-full cursor-pointer ml-2 ${
            activeTab === "transcript" ? "bg-[#EFEEEA]" : ""
          }`}
          aria-pressed={activeTab === "transcript"}
        >
          <FileText size={20} strokeWidth={2} className="text-[#6B6B6B]" />
          <span className="text-base font-medium text-[#6B6B6B]">Transcript</span>
        </button>
      )}
    </div>
  );
};


