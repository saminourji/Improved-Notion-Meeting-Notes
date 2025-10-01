"use client";

import React from "react";

interface NotesTabProps {
  children?: React.ReactNode;
}

export const NotesTab: React.FC<NotesTabProps> = ({ children }) => {
  // Placeholder: Host the existing editor/notes area if wired elsewhere
  return (
    <div className="p-2">
      {children ? (
        children
      ) : (
        <p className="text-sm text-gray-500">Write your notes here...</p>
      )}
    </div>
  );
};


