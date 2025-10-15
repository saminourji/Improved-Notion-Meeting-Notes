import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import DemoProvider from "@/components/providers/demo-provider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "New AI Meeting Notes",
  description: "AI-powered meeting transcription with speaker identification and smart summaries.",
  icons: {
    icon: "/Notion_AI_Face.png",
    shortcut: "/Notion_AI_Face.png",
    apple: "/Notion_AI_Face.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="meeting-notes-theme"
        >
          <DemoProvider>
            <Toaster position="bottom-right" />
            {children}
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
