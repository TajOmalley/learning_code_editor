import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner"

const montserrat = Montserrat({
  subsets:["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "naavis",
  description: "naavis - learn to code a project of your choice by uploading a GitHub repo or selecting a template",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${montserrat.className} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            >
              <Toaster/>
            {children}
            </ThemeProvider>

        </body>
      </html>
    </SessionProvider>
  );
}
