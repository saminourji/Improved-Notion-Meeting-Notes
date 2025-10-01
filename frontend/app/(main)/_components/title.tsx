"use client";

import { useRef, useState } from "react";
// import { api } from "@/convex/_generated/api"; // Removed for standalone version
// import { Doc } from "@/convex/_generated/dataModel"; // Removed for standalone version
// import { useMutation } from "convex/react"; // Removed for standalone version
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TitleProps {
  initialData: any; // Changed from Doc<"documents"> for standalone version
};

export const Title = ({initialData}:TitleProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    // const update = useMutation(api.documents.update); // Removed for standalone version

    const [title, setTitle] = useState(initialData.title || "Untitled")
    const [isEditing, setIsEditing] = useState(false)

    const enableInput = () => {
        setTitle(initialData.title);
        setIsEditing(true);
        setTimeout(()=>{
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(0, inputRef.current.value.length)
        },0) 
    }

    const disableInput = () => {
        setIsEditing(false);
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        // Mock update functionality for standalone version
        // update({
        //     id: initialData._id,
        //     title: e.target.value || "Untitled"
        // })
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.key === "Enter") {
            disableInput();
        }

    }

    return (
        <div className="flex items-center gap-x-1">
            {!!initialData.icon && <p>{initialData.icon}</p>}
            {
                isEditing ? (
                    <Input 
                    ref={inputRef}
                    onClick={enableInput}
                    onBlur={disableInput}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    value={title}
                    className="h-7 px-2 focus-visible:ring-transparent"
                    />
                ): (
                    <Button
                    onClick={enableInput}
                    variant="ghost"
                    size="sm"
                    className="font-normal h-auto p-1"
                    >
                       <span className="truncate"> {initialData?.title}</span>
                    </Button>
                )
            }
        </div>
    )
}


Title.Skeleton = function TitleSkeleton() {
    return (
        <Skeleton className="h-5 w-20 rounded-md"/>
    )
}