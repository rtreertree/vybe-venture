import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "cta" | "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  href?: string;
};

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-display font-semibold " +
  "transition-[transform,box-shadow,background-color] duration-150 ease-out " +
  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  cta: "bg-action text-white shadow-[0_6px_0_0_#C2410C,0_14px_24px_-8px_rgba(249,115,22,0.55)] active:translate-y-[3px] active:shadow-[0_3px_0_0_#C2410C,0_8px_16px_-8px_rgba(249,115,22,0.55)] hover:brightness-105",
  primary: "bg-royal text-white shadow-[0_4px_0_0_#1D4ED8] active:translate-y-[2px] active:shadow-[0_2px_0_0_#1D4ED8] hover:brightness-105",
  outline: "border-2 border-royal bg-transparent text-royal hover:bg-royal/5",
  ghost: "bg-transparent text-royal hover:bg-royal/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  href,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [base, variants[variant], sizes[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-busy={loading || undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {content}
    </button>
  );
}

export default Button;