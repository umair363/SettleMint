"use client";

import { Bell, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";
import { Switch } from "@/ui/controls";
import { Card, SectionHeader } from "@/ui/surface";

const HINT: Partial<Record<PushState, React.ReactNode>> = {
  "needs-install": (
    <>
      On iPhone, first tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> then “Add to Home
      Screen”, and open SettleMint from there.
    </>
  ),
  denied: "Notifications are blocked for SettleMint. Allow them in your browser's site settings, then come back.",
  unsupported: "This browser can't show notifications from SettleMint.",
};

/** Opt in to being told when friends add expenses or pay you, on this device. */
export function NotificationsCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

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
        if (next === "on") toast.success("Notifications are on for this device");
      } else {
        await disablePush();
        setState("off");
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message === "PUSH_UNAVAILABLE"
          ? "Notifications aren't available yet."
          : "Couldn't switch notifications on. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const hint = HINT[state];
  return (
    <section>
      <SectionHeader title="Notifications" />
      <Card className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
            <Bell className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Switch
              label="On this device"
              description="When friends add or change expenses, or pay you."
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
