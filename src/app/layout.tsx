import "./globals.css";

import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { ThemeProvider } from "@/shared/presentation/providers/theme-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumacraft | Data Engine & AI",
  description: "Dynamic data engine with smart templates and AI integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`} suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-background text-foreground antialiased"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
