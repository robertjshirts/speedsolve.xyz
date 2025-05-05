// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/globals.css";
import { Topbar } from "@/components/Topbar";
import '@/globals.css';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Speedsolve.xyz",
  description: "Join the community of speedcubers and compete in real-time solving challenges",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mx-auto flex justify-center max-w-screen-xl px-4 pt-24 h-screen`}
      >
        <Topbar />
        {children}
      </body>
    </html>
  );
}
