"use client";

import type { ActivityDto } from "@settlemint/shared";
import { Activity } from "lucide-react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import { ActivityRow } from "@/features/activity/activity-row";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { dayLabel } from "@/lib/dates";
import { useActivity, useMe } from "@/lib/queries";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { Card, List, SectionHeader } from "@/ui/surface";

function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivityPage() {
  const locale = useLocale();
  const me = useMe();
  const activity = useActivity();
  const t = useTranslations("activity");

  const days = useMemo(() => {
    const byDay = new Map<string, ActivityDto[]>();
    for (const e of activity.data?.pages.flatMap((p) => p.items) ?? []) {
      const day = localDay(e.createdAt);
      byDay.set(day, [...(byDay.get(day) ?? []), e]);
    }
    return [...byDay.entries()];
  }, [activity.data]);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PageBody>
        {activity.isPending ? (
          <Card>
            <SkeletonRows count={6} />
          </Card>
        ) : activity.error ? (
          <Card>
            <ErrorState onRetry={() => activity.refetch()} />
          </Card>
        ) : days.length === 0 ? (
          <Card>
            <EmptyState icon={<Activity />} title={t("emptyTitle")} body={t("emptyBody")} />
          </Card>
        ) : (
          <>
            {days.map(([day, events]) => (
              <section key={day}>
                <SectionHeader title={dayLabel(day, locale)} />
                <List>
                  {events.map((e) => (
                    <ActivityRow key={e.id} event={e} myUserId={me.data?.id} />
                  ))}
                </List>
              </section>
            ))}
            {activity.hasNextPage && (
              <Button variant="secondary" block loading={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                {t("showOlder")}
              </Button>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
