import "./globals.css";

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";

import { ThemeProvider } from "@/shared/presentation/providers/theme-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const roboto = localFont({
  src: [
    {
      path: "../../public/fonts/Roboto-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Roboto-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumacraft | Data Engine & AI",
  description: "Dynamic data engine with smart templates and AI integration.",
};

const shouldHideNextDevOverlayForE2E = process.env.ENABLE_TEST_AUTH === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${roboto.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground antialiased"
        style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
        data-e2e-test-mode={shouldHideNextDevOverlayForE2E ? "true" : undefined}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {shouldHideNextDevOverlayForE2E ? (
            <style>{`
              nextjs-portal,
              [data-nextjs-dev-overlay],
              [data-next-badge-root] {
                display: none !important;
                pointer-events: none !important;
              }

              [data-e2e-test-mode="true"] [data-guidance-coachmark] {
                display: none !important;
                pointer-events: none !important;
              }
            `}</style>
          ) : null}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
