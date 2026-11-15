export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm flex flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-surface-3 bg-surface-1 text-xs text-accent-cyan tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            System Online • Milestone 0 / Phase 1
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-primary">
            JARVIS
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
            Autonomous, high-integrity AI software engineering command centre.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="p-6 rounded-xl border border-surface-3 bg-surface-1 flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-accent-cyan">Environment Ready</h2>
            <p className="text-sm text-text-secondary">
              Next.js 15+ App Router, Tailwind CSS design tokens, and TypeScript baseline active.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-surface-3 bg-surface-1 flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-accent-ice">Main-Only Policy</h2>
            <p className="text-sm text-text-secondary">
              Strict repository governance with atomic commits and explicit remote push approval.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-surface-3 bg-surface-1 flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-success">Cost & Memory</h2>
            <p className="text-sm text-text-secondary">
              Free-tier model priority, zero unapproved spend, and durable PostgreSQL state.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
