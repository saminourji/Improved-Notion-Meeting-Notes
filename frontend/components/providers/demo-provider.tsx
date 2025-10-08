"use client";

import React, { useEffect } from "react";
import { installDemoDevHooks } from "@/lib/demo";

export const DemoProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try { installDemoDevHooks(); } catch {}
  }, []);
  return <>{children}</>;
};

export default DemoProvider;



