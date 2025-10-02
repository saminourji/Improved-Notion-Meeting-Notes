"use client";
import { FileText } from "lucide-react";

export const UserItem = () => {
  return (
    <div className="flex items-center text-sm p-3 w-full">
      <div className="gap-x-2 flex items-center">
        <FileText className="h-5 w-5" />
        <span className="text-start font-medium">
          Meeting Notes
        </span>
      </div>
    </div>
  );
};
