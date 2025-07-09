import type { Metadata } from "next"; // Import metadata type
import { Geist, Geist_Mono } from "next/font/google"; // Import fonts
import "./globals.css"; // Global styles

// Font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Add viewport to metadata
export const metadata: Metadata = {
  title: "Luggage Terminal",
  description: "Store your luggage",
  viewport: "width=device-width, initial-scale=1", // ← ✅ Required for mobile responsiveness

  icons: {
    icon: "/favicon.ico", // Optional: can use app/favicon.ico or public/favicon.ico
    apple: "/apple-icon.png",
  },

  appleWebApp: {
    title: "Luggage Terminal",
    // statusBarStyle: "default",
    // capable: true,
  },
};

// ✅ Layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
