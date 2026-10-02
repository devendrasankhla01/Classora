/**
 * Classora application root.
 *
 * NOTE (build order): the full shell (routing, providers, repositories,
 * attendance engine, analytics, PWA) is implemented on top of this file once
 * the approved Stitch UI assets are in the workspace. This entry point exists
 * so the toolchain, TypeScript project references and Tailwind pipeline are
 * verified end-to-end before UI work starts.
 */
export function App() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-app flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Classora</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Toolchain ready — awaiting the approved Stitch UI assets.
        </p>
      </div>
    </main>
  );
}
