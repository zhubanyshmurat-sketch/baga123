import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  narrow,
  ...props
}: HTMLAttributes<HTMLDivElement> & { narrow?: boolean }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  lead,
  eyebrow,
  children,
}: {
  title: string;
  lead?: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 md:mb-10">
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{title}</h1>
      {lead && <p className="mt-3 max-w-2xl text-lg text-muted">{lead}</p>}
      {children}
    </header>
  );
}

export function SectionHeading({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {lead && <p className="mt-1 max-w-2xl text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
