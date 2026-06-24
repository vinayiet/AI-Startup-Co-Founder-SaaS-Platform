import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "only light",
};

export const metadata: Metadata = {
  title: "AI Startup Co-Founder - Production-Grade Idea Validation",
  description: "Validate startup concepts, forecast financial models, inspect competitor positions, and compile investor-ready pitch materials in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-900">
      <body className={`${outfit.className} min-h-full flex flex-col antialiased selection:bg-purple-500/20 selection:text-purple-800`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
