import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ReminderCheckerWrapper from "@/components/ReminderCheckerWrapper";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaseMatch - Web3 Dating on Base",
  description: "The dating app where your wallet is your identity and reputation matters.",

  openGraph: {
    title: "BaseMatch - Find Your Match On-Chain",
    description: "No Bots, every profile is a wallet. Build real reputation, meet real people.",
    images: ['https://ipfs.filebase.io/ipfs/QmX3Tkqk4H2wW8n4P6VDsQdwEfEM3M9KkBcGrWBKAGLjXXb.png'],
    url: 'https://basematch.app',
    siteName: 'BaseMatch',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'BaseMatch - Find Your Match On-Chain',
    description: 'No Bots, every profile is a wallet. Build real reputation, meet real people.',
    images: ['https://ipfs.filebase.io/ipfs/QmX3Tkqk4H2wW8n4P6VDsQdwEfEM3M9KkBcGrWBKAGLjXX.png'],
  },

  icons: {
    icon: 'https://ipfs.filebase.io/ipfs/QmQ1A5FsxFhHUHkxQpH8uDvBrLQTDFPjT5XCDwhCFPW5ZZ.png',
    apple: 'https://ipfs.filebase.io/ipfs/QmQ1A5FsxFhHUHkxQpH8uDvBrLQTDFPjT5XCDwhCFPW5ZZ.png',
  },

  other: {
    'base:app_id': '69427d5ed19763ca26ddc392',
    'fc:miniapp': JSON.stringify({
      version: "next",
      imageUrl: "https://ipfs.filebase.io/ipfs/QmX3Tkqk4H2wW8n4P6VDsQdwEfEM3M9KkBcGrWBKAGLjXX.png",
      button: {
        title: "Web3 Dating on Base",
        action: {
          type: "launch_miniapp",
          name: "BaseMatch",
          url: "https://basematch.app",
          splashImageUrl: "https://ipfs.filebase.io/ipfs/QmZkcUNwxJvjdhs1u6WZMWu7F8911UwZZ3AwHufoUToUWD.png",
          splashBackgroundColor: "#0a0a0f"
        }
      }
    }),
  }
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* suppressHydrationWarning is critical when using a theme toggle */
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lexend.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-lexend), sans-serif' }}
      >
         <div style={{ zoom: 0.92 }}>
        <Providers>
          <ReminderCheckerWrapper />
          {children}
        </Providers>
      </body>
    </html>
  );
}
