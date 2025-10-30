// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";

// Fonts (next/font sets CSS variables we reference in body)
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Metadata (SEO + PWA)
export const metadata: Metadata = {
  title: {
    default: "Luggage Terminal",
    template: "%s • Luggage Terminal",
  },
  description: "Store your luggage & handle key handovers securely across Australia.",
  applicationName: "Luggage Terminal",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  appleWebApp: { title: "Luggage Terminal" },
};

// Viewport config supported by Next App Router
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

/** Small inline script to prevent theme flash before hydration.
 * - Uses localStorage 'theme' ('light'|'dark'|'system') or system preference.
 * - Runs synchronously in <head> to avoid FOUC.
 */
const themeInitScript = `
(function () {
  try {
    var KEY = 'theme';
    var saved = localStorage.getItem(KEY);
    
    // If user has explicitly set a preference, respect it
    // Otherwise, default to dark (even for first-time visitors)
    var theme = saved || 'dark';
    
    // Only check system preference if user explicitly chose 'system'
    if (saved === 'system') {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    
    // Apply dark theme
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {
    // Fallback to dark theme if anything fails
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* inline script must run before React to avoid flash */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>

      {/* body applies font CSS variables provided by next/font */}
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <main className="min-h-dvh">{children}</main>

        {/* Global toast container (client component). OK to keep here.) */}
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: "#4caf50", color: "#fff" } },
            error: { style: { background: "#f44336", color: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
