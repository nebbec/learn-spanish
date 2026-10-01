import Link from "next/link";
import { ROUTES } from "@/lib/routes";

// Placeholder menu. C6 replaces it with the wheel, live counts and Practice options.
export default function MenuPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-prompt font-bold">Learn Spanish</h1>
        <Link href={ROUTES.settings} className="font-bold text-brand">
          Settings
        </Link>
      </header>

      <nav className="flex flex-col gap-4">
        <Link
          href={ROUTES.learn}
          className="rounded-button bg-brand p-5 text-center font-display text-2xl font-bold text-on-brand"
        >
          Learn
        </Link>
        <Link
          href={ROUTES.practice}
          className="rounded-button border-2 border-brand bg-brand-soft p-5 text-center font-display text-2xl font-bold text-ink"
        >
          Practice
        </Link>
      </nav>

      {/* Token preview: the three rating colours with their text labels. */}
      <section aria-label="Rating colours" className="mt-auto grid grid-cols-3 gap-3 font-bold">
        <span className="rounded-button bg-again p-3 text-center text-on-again">Didn&apos;t have it</span>
        <span className="rounded-button bg-nearly p-3 text-center text-on-nearly">Nearly</span>
        <span className="rounded-button bg-good p-3 text-center text-on-good">Got it</span>
      </section>
    </main>
  );
}
