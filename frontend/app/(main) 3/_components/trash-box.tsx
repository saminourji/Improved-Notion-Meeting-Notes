"use client";

import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
// import { api } from "@/convex/_generated/api"; // Removed for standalone version
// import { Id } from "@/convex/_generated/dataModel"; // Removed for standalone version
// import { useMutation, useQuery } from "convex/react"; // Removed for standalone version
import { Search, Trash, Undo } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const TrashBox = () => {
  const router = useRouter();
  const params = useParams();
  // Mock empty trash for standalone version
  const documents: any[] = [];
  // const restore = useMutation(api.documents.restore); // Removed for standalone version
  // const remove = useMutation(api.documents.remove); // Removed for standalone version

  const [search, setSearch] = useState("");

  const filterDocuments = documents?.filter((document) => {
    return document.title.toLowerCase().includes(search.toLocaleLowerCase());
  });

  const onClick = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const onRestore = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    documentId: string // Changed from Id<"documents"> for standalone version
  ) => {
    event.stopPropagation();

    // Mock restore functionality for standalone version
    toast.success("Note restored (demo mode)");
  };

  const onRemove = (documentId: string) => { // Changed from Id<"documents"> for standalone version
    // Mock remove functionality for standalone version
    toast.success("Note deleted (demo mode)");

    if (params.documentId === documentId) {
      router.push("/documents");
    }
  };

  if (documents === undefined) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <div className="text-sm">
      <div className="flex items-center gap-x-1 p-2">
        <Search className="h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 px-2 focus-visible:ring-transparent bg-secondary"
          placeholder="Filter by page title"
        />
      </div>
      <div className="mt-2 px-1 pb-1">
        <p className="hidden last:block text-xs text-center">
          No documents found.
        </p>
        {filterDocuments?.map((document, ind) => {
          return (
            <div
              key={ind}
              role="button"
              onClick={() => onClick(document._id)}
              className="text-sm rounded-sm w-full hover:bg-primary/5 
                flex items-center text-primary justify-between"
            >
              <span className="truncate pl-2 ">{document.title}</span>
              <div className="flex items-center">
                <div
                  onClick={(e) => onRestore(e, document._id)}
                  role="button"
                  className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  <Undo className="h-4 w-4 to-muted-foreground" />
                </div>
                <ConfirmModal onConfirm={() => onRemove(document._id)}>
                  <div
                    role="button"
                    className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                  >
                    <Trash className="h-4 w-4 to-muted-foreground" />
                  </div>
                </ConfirmModal>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
