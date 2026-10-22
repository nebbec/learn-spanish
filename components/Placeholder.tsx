import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/** Stand-in for a screen that a later ticket builds. */
export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <Link href={ROUTES.menu} className="font-bold text-ink">
        ← Menu
      </Link>
      <div className="rounded-card border-2 border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-prompt font-bold">{title}</h1>
        <p className="mt-2 text-ink-soft">Coming in ticket {ticket}.</p>
      </div>
    </main>
  );
}
