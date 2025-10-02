"use client";

import { useParams } from "next/navigation";

export const Title = () => {
  const params = useParams();

  if (!params?.meetingId) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-1">
      <span className="text-sm font-medium">
        Meeting Notes
      </span>
    </div>
  );
};
