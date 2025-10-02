"use client";

// import { api } from "@/convex/_generated/api"; // Removed for standalone version
import { useSearch } from "@/hooks/use-search";
// import { useQuery } from "convex/react"; // Removed for standalone version
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { File } from "lucide-react";

export const SearchCommand = () => {
    const router = useRouter();
    // Mock documents for standalone version
    const documents = [
        {
            _id: "1",
            title: "Getting Started",
            icon: "📝",
        },
        {
            _id: "2",
            title: "Meeting Notes Template", 
            icon: "🎤",
        },
        {
            _id: "3",
            title: "Project Planning",
            icon: "📋",
        }
    ];
    const [isMounted,setIsMounted] = useState(false)

    const toggle = useSearch((store) => store.toggle)
    const isOpen = useSearch((store) => store.isOpen)
    const onClose = useSearch((store) => store.onClose)

    useEffect(()=>{
        setIsMounted(true);
    },[])

    useEffect(()=> {
        const down = (e: KeyboardEvent) => {
              if(e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle()
              }
        }
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    },[toggle])

    const onSelect = (id: string) => {
        // Mock navigation for standalone version
        // router.push(`/documents/${id}`);
        onClose();
        // In demo mode, just close the search
    }

    if(!isMounted) {
        return null;
    }

    return(
        <CommandDialog open={isOpen} onOpenChange={onClose}>
           <CommandInput placeholder="Search documents..."/>
           <CommandList>
            <CommandEmpty>No result found.</CommandEmpty>
            <CommandGroup heading="Documents">
              {documents?.map((document) =>(
                <CommandItem
                key={document._id}
                value={`${document._id}`}
                title={document.title}
                onSelect={onSelect}
                >
                  {
                    document.icon ? (
                        <p className="mr-2 text-[18px]">
                             {document.icon}
                        </p>
                    ): (
                        <File className="mr-2 h-4 w-4"/>
                    )
                  }
                  <span>{document.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
           </CommandList>
        </CommandDialog>
    )
}