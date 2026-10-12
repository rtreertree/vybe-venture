"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { readAccounts } from "@/libs/account-client";

export function MakePlanLink() {
  const router = useRouter();

  const startPlanning = () => {
    const result = readAccounts();
    router.push(result.ok && result.accounts.length > 0 ? "/dashboard" : "/question/register");
  };

  return (
    <button
      type="button"
      onClick={startPlanning}
      className="inline-flex min-h-10 items-center gap-2 bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent/90"
    >
      Make a plan <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );
}