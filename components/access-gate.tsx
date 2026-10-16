"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserToken, tokenHeaders } from "@/libs/user-token";

export function AccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowedPath, setAllowedPath] = useState("");
  const publicPage = pathname === "/" || pathname === "/access";

  useEffect(() => {
    if (publicPage) return;
    let active = true;
    if (!browserToken()) {
      router.replace("/access");
      return;
    }
    fetch("/api/identity", { headers: tokenHeaders(), cache: "no-store" })
      .then((response) => {
        if (!active) return;
        if (response.ok) setAllowedPath(pathname);
        else router.replace("/access");
      })
      .catch(() => { if (active) router.replace("/access"); });
    return () => { active = false; };
  }, [publicPage, router, pathname]);

  const allowed = publicPage || allowedPath === pathname;
  return <>
    <div className={allowed ? "contents" : "hidden"}>{children}</div>
    {!allowed && <div className="min-h-dvh bg-light-surface" aria-busy="true" />}
  </>;
}
