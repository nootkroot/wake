"use client";

import { usePathname } from "next/navigation";
import { WakeSceneBackdrop } from "@/components/landing/WakeSceneBackdrop";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Landing (/) renders its own WakeSceneBackdrop inside the full-screen main.
 * Other routes use the identical stack fixed behind page content.
 */
export function AppVisualChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] w-full bg-black">
      <SiteHeader />
      <WakeSceneBackdrop position="fixed" />
      <main className="wake-app-chrome relative z-10 mx-auto max-w-6xl px-6 pb-8 pt-[5.5rem] text-foreground">
        {children}
      </main>
    </div>
  );
}
