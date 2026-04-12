import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@capibara/ui";
import { ThemeProvider, ThemeToggle } from "@capibara/ui/theme";
import { Toaster } from "@capibara/ui/toast";

import { TRPCReactProvider } from "~/trpc/react";

import "~/app/globals.css";

import { env } from "~/env";
import { Navbar } from "./_components/navbar";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL ?? "http://localhost:3000"),
  title: "Capibara",
  description: "Receipt scanning app",
  openGraph: {
    title: "Capibara",
    description: "Receipt scanning app",
    url: env.APP_URL ?? "http://localhost:3000",
    siteName: "Capibara",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <div className="fixed bottom-4 right-4">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
