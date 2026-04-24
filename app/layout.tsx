import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "neuralengine — prompt diff",
  description:
    "Compare two LLM prompts side-by-side. See token counts, cost delta, and actual model outputs instantly.",
  openGraph: {
    title: "neuralengine.dev — prompt diff",
    description: "Compare LLM prompts on cost, tokens, and output quality.",
    url: "https://neuralengine.dev",
    siteName: "neuralengine.dev",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,400;1,9..144,600&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
