import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cyan" | "ice" | "success" | "warning" | "danger" | "outline";
  pulse?: boolean;
}

export function Badge({
  className = "",
  variant = "cyan",
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors";

  const variantStyles = {
    cyan: "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20",
    ice: "bg-accent-ice/10 text-accent-ice border border-accent-ice/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    danger: "bg-danger/10 text-danger border border-danger/20",
    outline: "border border-surface-3 text-text-secondary bg-surface-2/50",
  };

  const pulseColorStyles = {
    cyan: "bg-accent-cyan",
    ice: "bg-accent-ice",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    outline: "bg-text-secondary",
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {pulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${pulseColorStyles[variant]} motion-safe:animate-pulse`}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
