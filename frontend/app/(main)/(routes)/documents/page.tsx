"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to a demo document
    router.push("/documents/demo");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
