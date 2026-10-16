"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type MakePlanLinkProps = {
  label?: string;
  className?: string;
};

export function MakePlanLink({
  label = "Make a plan",
  className = "inline-flex min-h-10 items-center gap-2 bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent/90",
}: MakePlanLinkProps) {
  const router = useRouter();
  const [error, setError] = useState("");

  const startPlanning = () => {
    setError("");
    router.push("/access");
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={startPlanning} className={className}>
        {label} <ArrowRight className="h-5 w-5" aria-hidden />
      </button>
      {error && <span role="alert" className="mt-1 max-w-xs text-xs text-risk">{error}</span>}
    </span>
  );
}
