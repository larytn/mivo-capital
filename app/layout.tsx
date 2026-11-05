
import type { Metadata } from "next";
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
  robots: {
    index: false,
    follow: false,
  },
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
    <body className="min-h-full flex flex-col">
      <ThemeProvider><WorkspaceShell>{children}</WorkspaceShell></ThemeProvider>
    </body>
  </html>
);
}
