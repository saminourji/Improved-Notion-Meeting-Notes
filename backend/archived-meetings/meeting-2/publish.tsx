"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export const Publish = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          Share
          <Globe className="text-sky-500 w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72" 
        align="end"
        alignOffset={8}
        forceMount
      >
        <div className="space-y-4">
          <div className="flex items-center gap-x-2">
            <Globe className="text-sky-500 animate-pulse h-4 w-4" />
            <p className="text-xs font-medium text-sky-500">
              This meeting is live on web.
            </p>
          </div>
          <div className="flex items-center">
            <input
              className="flex-1 px-2 text-xs border rounded-l-md h-8 bg-muted truncate"
              value="https://meeting-notes.example.com/meetings/123"
              disabled
            />
            <Button
              onClick={() => {}}
              disabled={false}
              className="h-8 rounded-l-none"
              size="sm"
            >
              Copy
            </Button>
          </div>
          <Button
            size="sm"
            className="w-full text-xs"
            disabled={false}
            onClick={() => {}}
          >
            Unpublish
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
