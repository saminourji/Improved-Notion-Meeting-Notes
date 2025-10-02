import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Improved Notion Meeting Notes",
  description: "AI-powered meeting transcription with speaker identification and smart summaries.",
  icons: {
    icon: [
      {
        media: "(prefers-color-schema: light)",
        url: "/notion.svg",
        href: "/notion.svg",
      },
      {
        media: "(prefers-color-schema: dark)",
        url: "/notion.svg",
        href: "/notion.svg",
      },
    ],
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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="meeting-notes-theme"
        >
          <Toaster position="bottom-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
