import type { Metadata } from "next"; // Import metadata type for typing the metadata object
import { Geist, Geist_Mono } from "next/font/google"; // Import Google Fonts using next/font
import "./globals.css"; // Import global CSS for consistent styling

// Define font configurations with variables for easy reference in styles
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- THIS IS THE KEY CHANGE FOR FAVICONS AND APPLE META TAGS ---
export const metadata: Metadata = {
  title: "Luggage Terminal",
  description: "Store your luggage",
  // Favicons (handled by placing files in 'app' directory,
  // but you can be explicit if needed, or if the generator provided more complex ones)
  icons: {
    icon: '/favicon.ico', // This points to public/favicon.ico or app/favicon.ico
    apple: '/apple-icon.png', // This points to public/apple-icon.png or app/apple-icon.png
    // You can add more sizes here if needed, e.g.,
    // shortcut: ['/shortcut-icon.png'],
  },
  // Apple mobile web app title
  appleWebApp: {
    title: 'MyWebSite',
    // You can add more properties here as needed, e.g.,
    // statusBarStyle: 'default',
    // capable: true,
  },
  // Theme color for Android browser (often comes from RealFaviconGenerator)
  themeColor: '#ffffff', // Example, use the color provided by RealFaviconGenerator
};
// --- END OF KEY CHANGE ---


// Root layout component, wraps all pages with the global layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Add header, footer, or global navigation here if needed */}
        <main>{children}</main>
      </body>
    </html>
  );
}