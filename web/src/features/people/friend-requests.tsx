"use client";

import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useAnswerFriendRequest, useFriendRequests } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { List, SectionHeader } from "@/ui/surface";

/** People who asked to be my friend, with one tap to accept or decline. Nothing shows when there are none. */
export function FriendRequests() {
  const t = useTranslations("friends");
  const requests = useFriendRequests();
  const answer = useAnswerFriendRequest();
  const incoming = requests.data?.incoming ?? [];
  if (incoming.length === 0) return null;

  return (
    <section aria-label={t("requestsTitle")}>
      <SectionHeader title={t("requestsTitle")} />
      <List>
        {incoming.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3">
            <Avatar id={r.id} name={r.name} image={r.image} size="md" />
            <div className="min-w-[9rem] flex-1">
              <p className="truncate text-[16px] font-[620]">{r.name}</p>
              <p className="text-[13px] text-fg-muted">
                {r.username ? `@${r.username} · ` : ""}
                {t("wantsToAdd")}
              </p>
            </div>
            <div className="ms-auto flex shrink-0 gap-1.5">
              <Button size="sm" variant="ghost" disabled={answer.isPending} onClick={() => answer.mutate({ id: r.id, accept: false })}>
                {t("decline")}
              </Button>
              <Button
                size="sm"
                disabled={answer.isPending}
                onClick={() => answer.mutate({ id: r.id, accept: true }, { onSuccess: () => toast.success(t("friendsNow", { name: r.name })) })}
              >
                {t("accept")}
              </Button>
            </div>
          </div>
        ))}
      </List>
    </section>
  );
}
