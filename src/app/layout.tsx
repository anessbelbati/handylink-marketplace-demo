import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "./providers";
import { cn } from "@/lib/cn";
import { isDemoAuth } from "@/lib/auth-mode";

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HandyLink | Find Trusted Local Pros",
  description:
    "HandyLink is a two-sided marketplace demo built with Next.js, Convex, and Clerk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" className={cn(heading.variable, body.variable)}>
      <body className="grain">
        <ConvexClientProvider>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className: "glass shadow-soft",
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );

  // Demo mode is a local-dev escape hatch when Clerk dev domains are unreachable.
  if (isDemoAuth) return content;
  return <ClerkProvider>{content}</ClerkProvider>;
}
