import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** "This is not a medical diagnosis" notice. Shown on every test page and result. */
export function Disclaimer({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-fg",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
      <span>{t("notDiagnosis")}</span>
    </p>
  );
}
