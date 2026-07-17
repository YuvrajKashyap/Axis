import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { EscapeToOrrery } from "./EscapeToOrrery";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://axis.yuvrajkashyap.com"),
  title: {
    default: "Axis | Personal alignment system",
    template: "%s | Axis",
  },
  description:
    "A spatial personal alignment system for seeing drift, choosing the next move, and getting back to action.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Axis",
    title: "Axis | Personal alignment system",
    description:
      "See what is drifting, choose the next move, and get back to action.",
    images: [
      {
        url: "/showcase/axis-orrery.png",
        width: 1248,
        height: 720,
        alt: "The Axis public-demo orrery showing life domains as orbiting planets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axis | Personal alignment system",
    description:
      "See what is drifting, choose the next move, and get back to action.",
    images: ["/showcase/axis-orrery.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EscapeToOrrery />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
