import type { Metadata } from "next";
import "./globals.css";
import "video.js/dist/video-js.css";

export const metadata: Metadata = {
  title: "DramaPro",
  description: "Short drama streaming aggregator with live provider-backed playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
