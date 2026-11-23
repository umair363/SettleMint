"use client";

import { Plus } from "@/ui/icons";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import { BalanceLabel, GroupIcon } from "@/features/groups/group-row";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { usePeople } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { BalanceStatement, LedgerLine } from "@/ui/balance-statement";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { Card, List, ListRow, SectionHeader } from "@/ui/surface";

function Person() {
  const key = useSearchParams().get("key");
  const people = usePeople();
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const { openAddExpense } = useAddExpense();
  const person = people.data?.find((p) => p.key === key);

  const lead = person?.totals[0];
  // Adding an expense with them goes to your one-to-one group if there is one, else the group you share.
  const target = person?.groups.find((g) => g.type === "direct") ?? person?.groups[0];

  return (
    <>
      <PageHeader
        title={person?.name ?? t("title")}
        leading={person ? <Avatar id={person.key} name={person.name} image={person.image} size="lg" /> : undefined}
        back={{ href: "/groups", label: tc("back") }}
      />
      <PageBody>
        {people.error ? (
          <Card>
            <ErrorState onRetry={() => people.refetch()} />
          </Card>
        ) : people.isPending ? (
          <Card>
            <SkeletonRows count={4} />
          </Card>
        ) : !person ? (
          <Card>
            <EmptyState title={t("title")} body="" />
          </Card>
        ) : (
          <>
            <BalanceStatement
              label={lead ? (lead.amount > 0 ? t("owesYou", { name: person.name }) : t("youOwe", { name: person.name })) : t("square", { name: person.name })}
              minor={lead?.amount ?? 0}
              currency={lead?.currency ?? "USD"}
              settledText={lead ? undefined : "✓"}
              context={t("shared", { count: person.groups.length })}
            >
              {person.totals.slice(1).length > 0 && (
                <div className="mt-3 space-y-1">
                  {person.totals.slice(1).map((x) => (
                    <LedgerLine key={x.currency}>
                      <Money minor={x.amount} currency={x.currency} tone="auto" absolute className="font-wide font-[620]" />
                      <span>{x.amount > 0 ? t("owesYou", { name: person.name }) : t("youOwe", { name: person.name })}</span>
                    </LedgerLine>
                  ))}
                </div>
              )}
            </BalanceStatement>

            {target && (
              <Button variant="secondary" leading={<Plus className="size-[18px]" />} onClick={() => openAddExpense({ groupId: target.id })}>
                {tc("addExpense")}
              </Button>
            )}

            <section>
              <SectionHeader title={t("sharedGroups")} />
              <List>
                {person.groups.map((g) => (
                  <ListRow
                    key={g.id}
                    href={`/group?id=${g.id}`}
                    leading={<GroupIcon id={g.id} type={g.type} />}
                    title={g.name}
                    trailing={<BalanceLabel minor={g.amount} currency={g.currency} />}
                  />
                ))}
              </List>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}

export default function PersonPage() {
  return (
    <Suspense>
      <Person />
    </Suspense>
  );
}
