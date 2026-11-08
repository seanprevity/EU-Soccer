import type { Metadata } from "next";
import {
  Barlow,
  DM_Sans,
  Geist,
  Geist_Mono,
  Inter,
  Manrope,
} from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
});

const FONTS = {
  inter: "--font-inter",
};

// ← Change this to try another font
const ACTIVE_FONT: keyof typeof FONTS = "inter";

const fontVariables = [geistSans, geistMono, inter]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: "EU Football Stats",
    template: "%s | EU Football Stats",
  },
  description: "Made by Sean Previty",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontVariables} font-sans antialiased dark:bg-gray-900`}
        style={
          {
            "--font-active": `var(${FONTS[ACTIVE_FONT]})`,
          } as React.CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
