import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className="h-full dark bg-[#09090b] text-[#f4f4f5]">
      <body className={`${outfit.className} min-h-full flex flex-col antialiased selection:bg-purple-500/30 selection:text-purple-200`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
