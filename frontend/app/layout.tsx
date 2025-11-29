import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaseMatch - Web3 Dating on Base",
  description: "The dating app where your wallet is your identity and reputation matters.",
  other: {
    'fc:miniapp': JSON.stringify({
      version: "next",
      imageUrl: "https://your-domain.com/embed-image.png",
      button: {
        title: "Find Your Match",
        action: {
          type: "launch_miniapp",
          name: "BaseMatch",
          url: "https://your-domain.com"
        }
      }
    })
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
