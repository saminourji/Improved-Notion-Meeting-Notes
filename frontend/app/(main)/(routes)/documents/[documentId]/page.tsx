"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Toolbar } from "@/components/toolbar";
import { Cover } from "@/components/cover";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentIdPageProps {
  params: {
    documentId: string;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

  // Mock document data for demo
  const document = {
    id: params.documentId,
    title: params.documentId === "demo" ? "Demo!" : "Untitled",
    content: "",
    icon: null,
    coverImage: null,
    isArchived: false,
    isPublished: false,
  };

  if (!document) {
    return <div>Not found</div>;
  }

  return (
    <div className="pb-40">
      <Cover url={document.coverImage || undefined} />
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar initialData={document} />
        <Editor onChange={() => {}} initialContent={document.content} />
      </div>
    </div>
  );
};

export default DocumentIdPage;

