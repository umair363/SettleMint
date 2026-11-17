"use client";

import { ApiError } from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { AuthLayout } from "@/features/auth/auth-layout";
import { api } from "@/lib/api";
import { apiErrorText } from "@settlemint/client/text/api-error-text";
import { authClient } from "@/lib/auth-client";
import { keys, useMe } from "@settlemint/client/data/queries";
import { useHydrated } from "@/lib/use-hydrated";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { ErrorState, Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";

function Join() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const hydrated = useHydrated();
  const signedIn = Boolean(me.data);
  const t = useTranslations("join");

  const preview = useQuery({
    queryKey: [...keys.invite(token), signedIn],
    queryFn: () => api.invites.preview(token),
    enabled: token.length >= 16,
    retry: false,
  });

  const [spot, setSpot] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");

  const memberOf = preview.data?.alreadyMember ? preview.data.group.id : null;
  useEffect(() => {
    if (memberOf) router.replace(`/group?id=${memberOf}`);
  }, [memberOf, router]);

  const join = useMutation({
    meta: { handlesErrors: true },
    mutationFn: async () => {
      if (!signedIn) {
        const { error } = await authClient.signIn.anonymous();
        if (error) throw new Error(t("guestFailed"));
      }
      return api.invites.join(token, spot && spot !== "new" ? { memberId: spot } : { displayName: name.trim() || undefined });
    },
    onSuccess: async (group) => {
      await qc.invalidateQueries();
      router.replace(`/group?id=${group.id}`);
    },
  });

  if (!token || (preview.error instanceof ApiError && preview.error.status === 404)) {
    return (
      <AuthLayout>
        <ErrorState title={t("badLinkTitle")} body={t("badLinkBody")} />
        <Button variant="secondary" block onClick={() => router.push("/home")}>
          {t("goHome")}
        </Button>
      </AuthLayout>
    );
  }
  if (!hydrated || preview.isPending || me.isPending) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      </AuthLayout>
    );
  }
  if (preview.error) {
    return (
      <AuthLayout>
        <ErrorState onRetry={() => preview.refetch()} />
      </AuthLayout>
    );
  }

  const { group, openSpots, alreadyMember } = preview.data;
  if (alreadyMember) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-10">
          <Spinner label={t("opening")} />
        </div>
      </AuthLayout>
    );
  }

  const needsName = spot === "new" && !signedIn && !name.trim();
  const joinError =
    join.error instanceof ApiError && join.error.code === "ALREADY_CLAIMED"
      ? t("claimed")
      : join.error
        ? join.error instanceof ApiError
          ? apiErrorText(join.error)
          : join.error.message
        : null;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-surface-2 text-4xl">
            {group.emoji ?? "👥"}
          </div>
          <p className="text-sm text-fg-muted">{t("invitedTo")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-fg-muted">
            {t("people", { count: group.memberCount })} · {group.currency}
          </p>
        </div>

        {openSpots.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg-muted">{t("whichYou")}</p>
            <ul className="space-y-1.5" role="radiogroup" aria-label={t("pickName")}>
              {[...openSpots, { id: "new", displayName: t("someoneNew") }].map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={spot === s.id}
                    onClick={() => setSpot(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-start transition-colors",
                      spot === s.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
                    )}
                  >
                    {s.id === "new" ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-surface-3">
                        <UserPlus className="size-4" />
                      </span>
                    ) : (
                      <Avatar id={s.id} name={s.displayName} size="sm" />
                    )}
                    <span className="flex-1 font-medium">{s.displayName}</span>
                    {spot === s.id && <Check className="size-4 text-positive" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(openSpots.length === 0 || spot === "new") && !signedIn && (
          <TextField label={t("yourName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
        )}

        {joinError && (
          <p role="alert" className="text-center text-sm text-negative">
            {joinError}
          </p>
        )}

        <Button
          block
          size="lg"
          loading={join.isPending}
          disabled={(openSpots.length > 0 && !spot) || needsName || (openSpots.length === 0 && !signedIn && !name.trim())}
          onClick={() => join.mutate()}
        >
          {signedIn ? t("join") : t("joinGuest")}
        </Button>
        {!signedIn && (
          <p className="text-center text-sm text-fg-muted">
            {t.rich("haveAccount", {
              link: (chunks) => (
                <Link href={`/sign-in?next=${encodeURIComponent(`/join?t=${token}`)}`} className="font-medium text-positive">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
      </div>
    </AuthLayout>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <Join />
    </Suspense>
  );
}
