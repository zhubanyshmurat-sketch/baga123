"use client";

import { BadgeCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { deleteResourceAction, setUserRoleAction, verifyContactAction } from "@/lib/admin/actions";

export function DeleteButton({ resource, id }: { resource: string; id: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t("delete")}
        title={t("delete")}
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-coral-soft"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2" role="group" aria-label={t("deleteConfirm")}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteResourceAction(resource, id);
            if (result.ok) router.refresh();
            else setFailed(true);
          })
        }
        className="inline-flex min-h-11 items-center rounded-full bg-coral-soft px-4 text-sm font-bold text-coral-strong"
      >
        {t("delete")}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold">
        {t("deleteConfirm")}
      </button>
      {failed && <span role="alert" className="text-sm text-coral-strong">{t("errors.generic")}</span>}
    </span>
  );
}

export function VerifyButton({ id }: { id: string }) {
  const t = useTranslations("admin.contacts");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await verifyContactAction(id);
          if (result.ok) router.refresh();
        })
      }
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold hover:bg-primary-soft"
    >
      <BadgeCheck className="size-4" aria-hidden="true" />
      {t("verify")}
    </button>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled: boolean }) {
  const t = useTranslations("admin");
  const [value, setValue] = useState(role);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={value}
        disabled={disabled || pending}
        aria-label={t("users.changeRole")}
        title={disabled ? t("users.ownRole") : undefined}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          setState("idle");
          startTransition(async () => {
            const result = await setUserRoleAction(userId, next);
            if (result.ok) setState("saved");
            else {
              setValue(role);
              setState("error");
            }
          });
        }}
        className="min-h-11 rounded-xl border border-border-strong bg-bg px-3"
      >
        {(["student", "editor", "admin"] as const).map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </select>
      <span role="status" aria-live="polite" className="text-sm">
        {state === "saved" && <span className="text-primary-strong">{t("users.roleSaved")}</span>}
        {state === "error" && <span className="text-coral-strong">{t("errors.forbidden")}</span>}
      </span>
    </span>
  );
}
