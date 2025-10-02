"use client"
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation'
// import {Doc, Id} from '@/convex/_generated/dataModel'; // Removed for standalone version
import { useState } from 'react';
// import { useQuery } from 'convex/react'; // Removed for standalone version
// import { api } from '@/convex/_generated/api'; // Removed for standalone version
import { Item } from './item';
import { cn } from '@/lib/utils';
import { FileIcon } from 'lucide-react';


interface DocumentListProps {
    parentDocumentId?: string; // Changed from Id<"documents"> for standalone version
    level?: number;
    data?: any[] // Changed from Doc<"documents">[] for standalone version
}

export const DocumentList = ({
    parentDocumentId,
    level=0
}:DocumentListProps) => {
    const params = useParams()
    const router = useRouter()
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const onExpand = (documentId: string) =>{
        setExpanded(prevExpanded => ({
            ...prevExpanded,
            [documentId]: !prevExpanded[documentId]
        }))
    }

    // Mock documents for standalone version
    const documents = [
        {
            _id: "1",
            title: "Getting Started",
            icon: "📝",
            isArchived: false,
            parentDocument: parentDocumentId,
            userId: "demo"
        },
        {
            _id: "2", 
            title: "Meeting Notes Template",
            icon: "🎤",
            isArchived: false,
            parentDocument: parentDocumentId,
            userId: "demo"
        }
    ];

    const onRedirect = (documentId: string) => {
        router.push(`/documents/${documentId}`);
    };

    if(documents === undefined) {
        return (
            <>
            <Item.Skeleton level={level}/>
            {
                level === 0 && (
                    <>
                    <Item.Skeleton level={level}/>
                    <Item.Skeleton level={level}/>
                    </>
                )
            }
            </>
        )
    }

    return(
        <>
           <p
           style={{
            paddingLeft:level ? `${(level * 12 ) + 25}px` : undefined
           }}
           className={cn(
            "hidden text-sm font-medium to-muted-foreground/5",
            expanded && "last:block",
            level === 0 && "hidden"
           )}
           >
            No pages inside
           </p>
           {
            documents.map((document) =>(
                <div key={document._id}>
                <Item
                id={document._id}
                onClick={()=>onRedirect(document._id)}
                label={document.title}
                icon={FileIcon}
                documentIcon={document.icon}
                active={params.documentId === document._id}
                level={level}
                onExpand={()=> onExpand(document._id)}
                expanded={expanded[document._id]}

                />
                {expanded[document._id] && (
                    <DocumentList
                    parentDocumentId={document._id}
                    level={level + 1}
                    />
                )}
                </div>
            ))
           }
        </>
    )
}