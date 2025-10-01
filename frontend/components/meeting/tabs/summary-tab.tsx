"use client";

import React from "react";
import { ChevronDown, ChevronRight, MessageSquare, Copy, CheckSquare } from "lucide-react";

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  completed: boolean;
}

interface SummaryTabProps {
  summary: string;
  actionItems: ActionItem[];
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary, actionItems }) => {
  const [openSummary, setOpenSummary] = React.useState(true);
  const [openActions, setOpenActions] = React.useState(true);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setOpenSummary((v) => !v)}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {openSummary ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <MessageSquare className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(summary);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <Copy className="w-4 h-4" />
          </button>
        </button>
        {openSummary && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm leading-relaxed">
              {summary}
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setOpenActions((v) => !v)}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {openActions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CheckSquare className="w-4 h-4" />
            <span className="font-medium">Action Items ({actionItems.length})</span>
          </div>
        </button>
        {openActions && (
          <div className="px-4 pb-4">
            {actionItems.length > 0 ? (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <input type="checkbox" checked={item.completed} readOnly className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <div className="flex-1">
                      <p className={`text-sm ${item.completed ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>
                        {item.text}
                      </p>
                      {item.assignee && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Assigned to: {item.assignee}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No action items identified in this meeting.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


