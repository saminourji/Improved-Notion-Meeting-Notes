"use client";

import React from "react";
import { MeetingNavigation } from "@/components/meeting/meeting-navigation";
import { Toaster } from "sonner";

const StandaloneLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full flex dark:bg-[#1F1F1F]">
      <MeetingNavigation />
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default StandaloneLayout;
