"use client";

import type { MemberDto } from "@settlemint/shared";
import { Avatar } from "@/ui/avatar";
import { cn } from "@/ui/cn";
import { haptic } from "@/ui/motion";
import { Money } from "@/ui/money";
import type { DraftItem, SplitDraft, SplitPreview } from "./split-model";

/**
 * Receipt lines and who had each. Tap people to share a line between them;
 * tax, tip and service are spread by what each person ordered.
 */
export function ItemsEditor({
  members,
  myMemberId,
  currency,
  draft,
  onDraft,
  preview,
}: {
  members: MemberDto[];
  myMemberId: string;
  currency: string;
  draft: SplitDraft;
  onDraft: (d: SplitDraft) => void;
  preview: SplitPreview;
}) {
  const items = draft.items ?? [];
  const extras = draft.extras ?? 0;

  const toggle = (item: DraftItem, memberId: string) => {
    haptic(5);
    const has = item.memberIds.includes(memberId);
    // Every line needs someone; tapping the last person off keeps them.
    if (has && item.memberIds.length === 1) return;
    onDraft({
      ...draft,
      items: items.map((it) =>
        it.key === item.key
          ? { ...it, memberIds: has ? it.memberIds.filter((m) => m !== memberId) : [...it.memberIds, memberId] }
          : it,
      ),
    });
  };

  const setAll = (item: DraftItem) =>
    onDraft({ ...draft, items: items.map((it) => (it.key === item.key ? { ...it, memberIds: members.map((m) => m.id) } : it)) });

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">Tap who had each item. Shared items split evenly between the people tapped.</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              <Money minor={item.amount} currency={currency} className="text-[15px] font-medium" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Who had ${item.label}`}>
              {members.map((m) => {
                const on = item.memberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(item, m.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border pe-2.5 ps-1 text-[13px] font-medium transition-[transform,background-color,border-color] duration-150 active:scale-95",
                      on ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-muted",
                    )}
                  >
                    <Avatar id={m.id} name={m.displayName} image={m.image} size="xs" />
                    {m.id === myMemberId ? "You" : m.displayName.split(" ")[0]}
                  </button>
                );
              })}
              {item.memberIds.length < members.length && (
                <button type="button" onClick={() => setAll(item)} className="px-1 text-[13px] font-medium text-positive">
                  Everyone
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {extras !== 0 && (
        <div className="flex items-baseline justify-between gap-3 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2.5 text-sm">
          <span className="text-fg-muted">{extras > 0 ? "Tax, tip & service" : "Discounts"}, shared by what each ordered</span>
          <Money minor={extras} currency={currency} className="font-medium" />
        </div>
      )}

      {preview.shares && (
        <div className="space-y-1.5 rounded-[var(--radius-md)] border border-line p-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Each person pays</p>
          {preview.shares.map((s) => {
            const m = members.find((x) => x.id === s.memberId);
            return (
              <div key={s.memberId} className="flex items-center justify-between text-[15px]">
                <span>{s.memberId === myMemberId ? "You" : m?.displayName}</span>
                <Money minor={s.amount} currency={currency} className="font-medium" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
