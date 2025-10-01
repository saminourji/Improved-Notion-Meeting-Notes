"use client";

// import { Doc } from "@/convex/_generated/dataModel"; // Removed for standalone version
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrigin } from "@/hooks/use-origin";
// import { useMutation } from "convex/react"; // Removed for standalone version
// import { api } from "@/convex/_generated/api"; // Removed for standalone version
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy, Globe } from "lucide-react";

interface PublishProps {
  initialData: any; // Changed from Doc<"documents"> for standalone version
}

export const Publish = ({ initialData }: PublishProps) => {
  const origin = useOrigin();
  // const update = useMutation(api.documents.update); // Removed for standalone version

  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const url = `${origin}/preview/${initialData._id}`;

  const onPublish = () => {
    setIsSubmitting(true);

    // Mock publish functionality for standalone version
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Note published (demo mode)");
    }, 1000);
  };

  const onUnPublish = () => {
    setIsSubmitting(true);

    // Mock unpublish functionality for standalone version
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Note unpublished (demo mode)");
    }, 1000);
  };

  const onCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>
          Publish
          {initialData.isPublished && (
            <Globe className="text-sky-500 w-4 h-4 ml-2" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" alignOffset={8} forceMount>
        {initialData.isPublished ? (
          <div className="space-y-4">
            <div className="flex items-center gap-x-2">
              <Globe className="text-sky-500 animate-pulse w-4 h-4" />
              <p className="text-xs font-medium text-sky-500">
                This note is live on web.
              </p>
            </div>
            <div className="flex items-center">
              <input
                value={url}
                disabled
                className="flex-1 px-2 text-xs border rounded-l-md h-8 
                bg-muted truncate"
              />
              <Button
              onClick={onCopy}
              disabled={copied}
              className="h-8 rounded-l-none"
              >
                 {copied ? (
                    <Check className="w-4 h-4"/>
                 ): (
                    <Copy className="w-4 h-4"/>
                 )}
              </Button>
            </div>
            <Button
            size="sm"
            className="w-full "
            disabled={isSubmitting}
            onClick={onUnPublish}
            >
                Unpublish
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Globe className="h-8 w-8 to-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-2">Publishing this note</p>
            <span className="text-xs text-muted-foreground mb-4">
              Share you work with others.
            </span>
            <Button
              disabled={isSubmitting}
              onClick={onPublish}
              className="w-full text-xs"
              size="sm"
            >
              Publish
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
