"use client";

import { useRouter } from "next/navigation";
import { MenuScreen } from "@/components/menu";
import { InstallPrompt } from "@/components/pwa";

/** The menu with the app's router: a tapped slice of the wheel opens Practice for that part of speech. */
export function MenuRoute() {
  const router = useRouter();
  return (
    <>
      <InstallPrompt />
      <MenuScreen onNavigate={(href) => router.push(href)} />
    </>
  );
}
