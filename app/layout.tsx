import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "replay.md — Share your agent sessions",
  description:
    "Replay captures your Claude Code and Codex conversations and gives them a shareable URL.",
  openGraph: {
    title: "replay.md — Share your agent sessions",
    description:
      "Replay captures your Claude Code and Codex conversations and gives them a shareable URL.",
    siteName: "replay.md",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
