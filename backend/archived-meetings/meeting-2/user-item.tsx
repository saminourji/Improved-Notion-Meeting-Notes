"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronsLeftRight } from "lucide-react";

export const UserItem = () => {
  return (
    <div className="flex items-center text-sm p-3 w-full hover:bg-primary/5">
      <div className="gap-x-2 flex items-center max-w-[150px]">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-xs">
            U
          </AvatarFallback>
        </Avatar>
        <span className="text-start font-medium line-clamp-1">
          sami
        </span>
      </div>
      <ChevronsLeftRight className="rotate-90 ml-2 text-muted-foreground h-4 w-4" />
    </div>
  );
};
