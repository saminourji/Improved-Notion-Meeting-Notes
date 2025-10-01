"use client";

import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";
// import { api } from "@/convex/_generated/api"; // Removed for standalone version
// import { Id } from "@/convex/_generated/dataModel"; // Removed for standalone version
// import { useMutation } from "convex/react"; // Removed for standalone version
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BannerProps {
  documentId: string; // Changed from Id<"documents"> for standalone version
}

export const Banner = ({ documentId }: BannerProps) => {
  const router = useRouter();

  // const remove = useMutation(api.documents.remove); // Removed for standalone version
  // const restore = useMutation(api.documents.restore); // Removed for standalone version

  const onRemove = () => {
    // Mock remove functionality for standalone version
    toast.success("Note deleted (demo mode)");
    // router.push("/documents");
  };

  const onRestore = () => {
    // Mock restore functionality for standalone version
    toast.success("Note restored (demo mode)");
  };

  return (
    <div
      className="w-full bg-rose-500 text-center text-sm p-2
        text-white flex items-center gap-x-2 justify-center"
    >
      <p>This page is in the Trash</p>
      <Button
        size="sm"
        onClick={onRestore}
        variant="outline"
        className="border-white bg-transparent hover:bg-primary/5
           text-white hover:text-white p-1 px-2 h-auto font-normal"
      >
        Restore page
      </Button>
      <ConfirmModal onConfirm={onRemove}>
        <Button
          size="sm"
          onClick={onRemove}
          variant="outline"
          className="border-white bg-transparent hover:bg-primary/5
           text-white hover:text-white p-1 px-2 h-auto font-normal"
        >
          Delete forever
        </Button>
      </ConfirmModal>
    </div>
  );
};
