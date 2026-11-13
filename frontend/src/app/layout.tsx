import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STARK INDUSTRIES // J.A.R.V.I.S — AI Autonomous Defense & Engineering Core",
  description: "Personal, cloud-coordinated autonomous AI engineering platform inspired by Stark Industries J.A.R.V.I.S.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen text-cyan-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Top Telemetry Ruler */}
        <div className="w-full bg-[#020b18]/90 border-b border-cyan-500/30 px-3 py-1 text-[10px] font-mono tracking-widest text-cyan-500/70 flex justify-between items-center select-none overflow-x-hidden">
          <div className="flex gap-4">
            {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15"].map((num) => (
              <span key={num} className="hover:text-cyan-300 transition-colors">
                {num} <span className="opacity-40">|</span>
              </span>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            MARK LXXXV // NEURAL INTERFACE ONLINE
          </div>
          <div className="flex gap-4">
            {["16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"].map((num) => (
              <span key={num} className="hover:text-cyan-300 transition-colors">
                {num} <span className="opacity-40">|</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stark Industries HUD Header */}
        <header className="border-b border-cyan-500/30 bg-[#020914]/85 backdrop-blur-md px-4 lg:px-8 py-2.5 sticky top-0 z-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Hologram Arc Icon */}
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-cyan-400/50 animate-spin-slow" />
              <div className="absolute w-5 h-5 rounded-full border border-cyan-300/80 animate-spin-reverse" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base lg:text-lg text-cyan-300 glow-cyan">
                  STARK INDUSTRIES
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-cyan-500/50 text-cyan-300 bg-cyan-950/40">
                  J.A.R.V.I.S.
                </span>
              </div>
              <p className="text-[10px] font-mono text-cyan-500 tracking-wider">
                AUTONOMOUS ENGINEERING PROTOCOL v1.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-cyan-400 text-[11px] font-semibold">
                SYSTEM TELEMETRY: NOMINAL
              </span>
              <span className="text-[10px] text-cyan-600">
                HOST LATENCY: 12ms // ENCRYPTION: AES-256
              </span>
            </div>
            <div className="h-6 w-px bg-cyan-500/30 hidden sm:block" />
            <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 rounded text-cyan-300 text-xs">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff] animate-pulse" />
              <span className="tracking-wider font-semibold">CORE ONLINE</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
