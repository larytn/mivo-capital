
/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { WorkspaceShell } from "./components/workspace-shell";

export const metadata: Metadata = {
  title: {
    default: "Mivo Capital | The Trading Ecosystem",
    template: "%s | Mivo Capital",
  },
  description:
    "Backtest trading ideas, keep a clear trade journal, connect MT5, and share market discussions with the Mivo trader community.",
  applicationName: "Mivo Capital",
  appleWebApp: {
    capable: true,
    title: "Mivo Capital",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/mivo-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/mivo-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/mivo-icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    images: [{ url: "/brand/mivo-capital-logo-transparent.png", width: 2104, height: 747, alt: "Mivo Capital" }],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080A0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html
    lang="en"
    data-theme="dark"
    className="h-full antialiased"
  >
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </head>
    <body className="min-h-full flex flex-col">
      <ThemeProvider><WorkspaceShell>{children}</WorkspaceShell></ThemeProvider>
    </body>
  </html>
);
}
