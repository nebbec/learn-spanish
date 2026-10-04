"use client";

import { useRouter } from "next/navigation";
import { MenuScreen } from "@/components/menu";
import { InstallPrompt } from "@/components/pwa";
import { SyncStatusLine, useSyncStatus } from "@/components/sync";

/**
 * The menu with the app's router (a tapped petal of the wheel opens Practice for that
 * part of speech) and the sync status, whose line sits in the menu sheet.
 */
export function MenuRoute() {
  const router = useRouter();
  const { status } = useSyncStatus();
  return (
    <>
      <InstallPrompt />
      <MenuScreen
        onNavigate={(href) => router.push(href)}
        status={<SyncStatusLine />}
        syncFailed={status.phase === "failed"}
      />
    </>
  );
}
