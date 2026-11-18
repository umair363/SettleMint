"use client";

import { Bell, Share } from "@/ui/icons";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";
import { Switch } from "@/ui/controls";
import { Card, SectionHeader } from "@/ui/surface";
import { useTranslations } from "use-intl";


/** Opt in to being told when friends add expenses or pay you, on this device. */
export function NotificationsCard() {
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
    <section>
      <SectionHeader title={t("title")} />
      <Card className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
            <Bell className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Switch
              label={t("onThisDevice")}
              description={t("description")}
              checked={state === "on"}
              disabled={busy || Boolean(hint)}
              onCheckedChange={toggle}
            />
          </div>
        </div>
        {hint && <p className="text-[13px] text-fg-muted">{hint}</p>}
      </Card>
    </section>
  );
}
