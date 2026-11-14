import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: 'Jarvis – Autonomous Personal AI Operating System',
  description: 'Autonomous software engineering operating system with strict financial and security governance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-mono">
          JARVIS OS v0.3.0 • Continuous Execution • OpenRouter Free Gateway • PostgreSQL pgmq
        </footer>
      </body>
    </html>
  );
}
