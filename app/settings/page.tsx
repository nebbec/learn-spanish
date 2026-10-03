import Link from "next/link";
import { AutoplaySwitch, DownloadEverything, SignIn } from "@/components/settings";
import { SyncPanel } from "@/components/sync";
import { ROUTES } from "@/lib/routes";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <Link href={ROUTES.menu} className="font-bold text-brand">
        ← Menu
      </Link>
      <h1 className="font-display text-prompt font-bold">Settings</h1>
      <AutoplaySwitch />
      <DownloadEverything />
      <SignIn />
      <SyncPanel />
    </main>
  );
}
