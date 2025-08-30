// app/layout.tsx
import type { Metadata } from "next"; 
import { Geist, Geist_Mono } from "next/font/google"; 
import "./globals.css"; 
import { Toaster } from "react-hot-toast"; // ✅ Import toaster

// Font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Metadata
export const metadata: Metadata = {
  title: "Luggage Terminal",
  description: "Store your luggage",
  viewport: "width=device-width, initial-scale=1", 
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    title: "Luggage Terminal",
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
        <Toaster // ✅ Add toaster provider
          position="top-right"
          toastOptions={{
            success: {
              style: {
                background: "#4caf50",
                color: "#fff",
              },
            },
            error: {
              style: {
                background: "#f44336",
                color: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
