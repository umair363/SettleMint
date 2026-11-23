"use client";

import { Bell, Share } from "@/ui/icons";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";
import { Switch } from "@/ui/controls";
import { IconTile } from "@/ui/glyph-tile";
import { useTranslations } from "use-intl";


/** One settings row: opt in to being told when friends add expenses or pay you, on this device. */
export function NotificationsRow() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslations("notifications");

  useEffect(() => {
    let live = true;
    void pushState().then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, []);

  if (!state) return null;

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        const next = await enablePush();
        setState(next);
        if (next === "on") toast.success(t("on"));
      } else {
        await disablePush();
        setState("off");
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message === "PUSH_UNAVAILABLE"
          ? t("unavailable")
          : t("failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const hint =
    state === "needs-install"
      ? t.rich("needsInstall", { share: () => <Share className="inline size-4 align-text-bottom" aria-label={t("share")} /> })
      : state === "denied"
        ? t("denied")
        : state === "unsupported"
          ? t("unsupported")
          : null;
  return (
    <div className="flex min-h-16 items-start gap-3 px-4 py-3">
      <span className="mt-0.5">
        <IconTile>
          <Bell />
        </IconTile>
      </span>
      <div className="min-w-0 flex-1 self-center">
        <Switch
          label={t("onThisDevice")}
          description={hint ? undefined : t("description")}
          checked={state === "on"}
          disabled={busy || Boolean(hint)}
          onCheckedChange={toggle}
        />
        {hint && <p className="mt-1 text-[13px] text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}
