import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Jarvis — AI Engineering Platform",
  description: "Personal, secure, cloud-coordinated autonomous AI assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-semibold text-lg tracking-tight">PROJECT JARVIS</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              MVP 1.0
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Control Plane: ONLINE
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
