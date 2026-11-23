"use client";

import type { PersonDto } from "@settlemint/shared";
import { useTranslations } from "use-intl";
import { BalanceLabel } from "@/features/groups/group-row";
import { Avatar } from "@/ui/avatar";
import { ListRow } from "@/ui/surface";

/** People worth listing apart from friends: someone you share a real group with who you owe or are owed by, or share several with. */
export function listablePeople(people: PersonDto[] | undefined): PersonDto[] {
  return (people ?? []).filter((p) => {
    const onlyFriendGroup = p.groups.length === 1 && p.groups[0].type === "direct";
    return !onlyFriendGroup && (p.totals.length > 0 || p.groups.length > 1);
  });
}

export function PersonRow({ person }: { person: PersonDto }) {
  const t = useTranslations("people");
  return (
    <ListRow
      href={`/person?key=${encodeURIComponent(person.key)}`}
      leading={<Avatar id={person.key} name={person.name} image={person.image} size="md" />}
      title={person.name}
      subtitle={t("shared", { count: person.groups.length })}
      trailing={
        person.totals.length === 0 ? (
          <BalanceLabel minor={0} currency="USD" />
        ) : (
          <span className="flex flex-col gap-1">
            {person.totals.map((x) => (
              <BalanceLabel key={x.currency} minor={x.amount} currency={x.currency} />
            ))}
          </span>
        )
      }
    />
  );
}
