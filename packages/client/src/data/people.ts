import type { PersonDto } from "@settlemint/shared";

/**
 * People worth listing apart from friends: someone you share a real group with
 * who you owe or are owed by, or someone you share several groups with. A friend
 * you only have a one-to-one group with is already in the Friends list.
 */
export function listablePeople(people: PersonDto[] | undefined): PersonDto[] {
  return (people ?? []).filter((p) => {
    const onlyFriendGroup = p.groups.length === 1 && p.groups[0].type === "direct";
    return !onlyFriendGroup && (p.totals.length > 0 || p.groups.length > 1);
  });
}
