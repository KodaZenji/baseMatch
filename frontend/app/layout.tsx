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

  // Open Graph (for social sharing)
  openGraph: {
    title: "BaseMatch - Find Your Match On-Chain",
    description: "Your wallet is your dating profile. Build real reputation, meet real people.",
    images: ['https://ipfs.filebase.io/ipfs/QmdvmF7F39sYqF345gyzWnWQdff66JjDNTFokBXwwrPW5b.png'],
    url: 'https://basematch.app',
    siteName: 'BaseMatch',
    type: 'website',
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BaseMatch - Find Your Match On-Chain',
    description: 'Your wallet is your dating profile. Build real reputation, meet real people.',
    images: ['https://ipfs.filebase.io/ipfs/QmdvmF7F39sYqF345gyzWnWQdff66JjDNTFokBXwwrPW5b.png'],
  },

  // Icons
  icons: {
    icon: 'https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw.png',
    apple: 'https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw.png',
  },

  other: {
    'base:app_id': '69427d5ed19763ca26ddc392',
    'fc:miniapp': JSON.stringify({
      version: "next",
      imageUrl: "https://ipfs.filebase.io/ipfs/QmdvmF7F39sYqF345gyzWnWQdff66JjDNTFokBXwwrPW5b.png",
      button: {
        title: "Find Your Match",
        action: {
          type: "launch_miniapp",
          name: "BaseMatch",
          url: "https://basematch.app",
          splashImageUrl: "https://ipfs.filebase.io/ipfs/QmZkcUNwxJvjdhs1u6WZMWu7F8911UwZZ3AwHufoUToUWD.png",
          splashBackgroundColor: "#3B82F6"
        }
      }
    }),
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://ipfs.filebase.io/ipfs/QmdvmF7F39sYqF345gyzWnWQdff66JjDNTFokBXwwrPW5b.png',
    'fc:frame:button:1': 'Find Your Match',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://basematch.app',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-lexend)' }}
      >
        <Providers>
          <ReminderCheckerWrapper />
          {children}
        </Providers>
      </body>
    </html>
  );
}
