"use client";

import { MeetingNavigation } from "@/components/meeting/meeting-navigation";

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex dark:bg-[#1F1F1F]">
      <MeetingNavigation />
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
