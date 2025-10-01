"use client";
import { useRouter } from "next/navigation";
// import { api } from "@/convex/_generated/api"; // Removed for standalone version
// import { Id } from "@/convex/_generated/dataModel"; // Removed for standalone version
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { useMutation } from "convex/react"; // Removed for standalone version
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuProps {
  documentId: string; // Changed from Id<"documents"> for standalone version
}

export const Menu = ({ documentId }: MenuProps) => {
  const router = useRouter();

  // const archive = useMutation(api.documents.archive); // Removed for standalone version

  const onArchive = () => {
    // Mock archive functionality for standalone version
    toast.success("Note archived (demo mode)");
    // router.push("/documents");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-60"
        align="end"
        alignOffset={8}
        forceMount
      >
        <DropdownMenuItem onClick={onArchive}>
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

Menu.Skeleton = function MenuSkeleton() {
  return <Skeleton className="h-10 w-10" />;
};
