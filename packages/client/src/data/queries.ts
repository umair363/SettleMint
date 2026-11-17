"use client";

import {
  ApiError,
  type CreateExpenseBody,
  type CreateGroupBody,
  type CreateRecurringBody,
  type CreateSettlementBody,
  type ExpenseDto,
  type GroupDetailDto,
  type SettlementDto,
  type GroupSummaryDto,
  type UpdateExpenseBody,
  type UpdateGroupBody,
  type UpdateMeBody,
} from "@settlemint/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { uuidv7 } from "uuidv7";
import type { Page } from "@settlemint/shared";
import { api } from "./api";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** The screen shows its own error message; skip the global toast. */
      handlesErrors?: boolean;
    };
  }
}

/** Every cache key in one place, so invalidation can't miss a copy. */
export const keys = {
  me: ["me"] as const,
  groups: ["groups"] as const,
  group: (id: string) => ["group", id] as const,
  expenses: (groupId: string) => ["expenses", groupId] as const,
  expense: (id: string) => ["expense", id] as const,
  settlements: (groupId: string) => ["settlements", groupId] as const,
  recurring: (groupId: string) => ["recurring", groupId] as const,
  activity: ["activity"] as const,
  groupActivity: (groupId: string, entityId?: string) => ["activity", groupId, entityId ?? "all"] as const,
  invite: (token: string) => ["invite", token] as const,
};

/** After anything changes in a group, refresh everything that shows it. */
export function invalidateGroup(qc: QueryClient, groupId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.group(groupId) }),
    qc.invalidateQueries({ queryKey: keys.groups }),
    qc.invalidateQueries({ queryKey: keys.expenses(groupId) }),
    qc.invalidateQueries({ queryKey: keys.settlements(groupId) }),
    qc.invalidateQueries({ queryKey: keys.recurring(groupId) }),
    qc.invalidateQueries({ queryKey: keys.activity }),
  ]);
}

// ─── Reads ─────────────────────────────────────────────────────────────────

/** My profile. Pass enabled=false while signed out (the phone knows from its saved session). */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.me.get(),
    enabled,
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 2,
    staleTime: 5 * 60_000,
  });
}

export function useGroups() {
  return useQuery({ queryKey: keys.groups, queryFn: api.groups.list });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: keys.group(id ?? ""),
    queryFn: () => api.groups.get(id!),
    enabled: Boolean(id),
  });
}

export function useExpenses(groupId: string | null) {
  return useInfiniteQuery({
    queryKey: keys.expenses(groupId ?? ""),
    queryFn: ({ pageParam }) => api.expenses.list(groupId!, { cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(groupId),
  });
}

export function useSettlements(groupId: string | null) {
  return useQuery({
    queryKey: keys.settlements(groupId ?? ""),
    queryFn: () => api.settlements.list(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useActivity() {
  return useInfiniteQuery({
    queryKey: keys.activity,
    queryFn: ({ pageParam }) => api.activity.all({ cursor: pageParam, limit: 40 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useEntityHistory(groupId: string, entityId: string | null) {
  return useQuery({
    queryKey: keys.groupActivity(groupId, entityId ?? undefined),
    queryFn: () => api.activity.group(groupId, { entityId: entityId!, limit: 50 }),
    enabled: Boolean(entityId),
  });
}

// ─── Writes ────────────────────────────────────────────────────────────────

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeBody) => api.me.update(body),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateGroupBody, "id">) => api.groups.create({ id: uuidv7(), ...body }),
    onSuccess: (group) => {
      qc.setQueryData(keys.group(group.id), group);
      // Put it in the saved list right away, so it's there even if the
      // network drops before the list is fetched again.
      qc.setQueryData<GroupSummaryDto[]>(keys.groups, (old) => [
        {
          id: group.id,
          name: group.name,
          currency: group.currency,
          type: group.type,
          emoji: group.emoji,
          color: group.color,
          memberCount: group.members.filter((m) => !m.left).length,
          myBalance: group.myBalance,
          archived: group.archived,
          lastActivityAt: group.lastActivityAt,
          version: group.version,
        },
        ...(old ?? []).filter((g) => g.id !== group.id),
      ]);
      return qc.invalidateQueries({ queryKey: keys.groups });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGroupBody) => api.groups.update(groupId, body),
    onSuccess: (group) => {
      qc.setQueryData(keys.group(groupId), group);
      return invalidateGroup(qc, groupId);
    },
  });
}

type ExpensePages = InfiniteData<Page<ExpenseDto>, string | undefined>;

// ─── Offline-safe writes ───────────────────────────────────────────────────
// Creates are registered as mutation defaults so a queued (offline) write
// can run after a reload, when the screen that started it is long gone. Each
// carries a client-made id, so a retry can never create a duplicate.

export const mutationKeys = {
  createExpense: ["expense", "create"] as const,
  createSettlement: ["settlement", "create"] as const,
};

/** Keep retrying network failures for about a minute: a free server can take that long to wake. */
const networkRetry = {
  retry: (count: number, err: unknown) => err instanceof ApiError && err.isNetwork && count < 6,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 15_000),
};

type CreateExpenseVars = { groupId: string; body: CreateExpenseBody & { id: string } };
type CreateSettlementVars = { groupId: string; body: CreateSettlementBody & { id: string } };

export function registerMutationDefaults(qc: QueryClient) {
  qc.setMutationDefaults(mutationKeys.createExpense, {
    mutationFn: ({ groupId, body }: CreateExpenseVars) => api.expenses.create(groupId, body),
    onSettled: (_d, _e, vars: CreateExpenseVars) => invalidateGroup(qc, vars.groupId),
    ...networkRetry,
  });
  qc.setMutationDefaults(mutationKeys.createSettlement, {
    mutationFn: ({ groupId, body }: CreateSettlementVars) => api.settlements.create(groupId, body),
    onSettled: (_d, _e, vars: CreateSettlementVars) => invalidateGroup(qc, vars.groupId),
    ...networkRetry,
  });
}

/** Create an expense; the new row shows instantly and survives going offline. */
export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  const mutation = useMutation<ExpenseDto, Error, CreateExpenseVars, { previous?: ExpensePages }>({
    mutationKey: mutationKeys.createExpense,
    onMutate: async ({ body }) => {
      await qc.cancelQueries({ queryKey: keys.expenses(groupId) });
      const previous = qc.getQueryData<ExpensePages>(keys.expenses(groupId));
      const now = new Date().toISOString();
      const optimistic: ExpenseDto = {
        id: body.id,
        groupId,
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        fxRate: body.fxRate ?? "1",
        groupAmount: body.amount,
        category: body.category ?? "other",
        date: body.date,
        notes: body.notes ?? null,
        split: body.split,
        lines: [],
        createdByUserId: null,
        recurringRuleId: null,
        version: 1,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      };
      if (previous) {
        qc.setQueryData<ExpensePages>(keys.expenses(groupId), {
          ...previous,
          pages: previous.pages.map((p, i) => (i === 0 ? { ...p, items: [optimistic, ...p.items] } : p)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.expenses(groupId), ctx.previous);
    },
  });
  return {
    ...mutation,
    mutate: (body: CreateExpenseBody & { id: string }) => mutation.mutate({ groupId, body }),
  };
}

export function useUpdateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { handlesErrors: true },
    mutationFn: ({ id, body }: { id: string; body: UpdateExpenseBody }) => api.expenses.update(id, body),
    onSuccess: (expense) => qc.setQueryData(keys.expense(expense.id), expense),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

/** Delete or restore. Deleting hides the row at once; the toast offers undo. */
export function useSetExpenseDeleted(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      deleted ? api.expenses.remove(id) : api.expenses.restore(id),
    onMutate: async ({ id, deleted }) => {
      if (!deleted) return {};
      await qc.cancelQueries({ queryKey: keys.expenses(groupId) });
      const previous = qc.getQueryData<ExpensePages>(keys.expenses(groupId));
      if (previous) {
        qc.setQueryData<ExpensePages>(keys.expenses(groupId), {
          ...previous,
          pages: previous.pages.map((p) => ({ ...p, items: p.items.filter((e) => e.id !== id) })),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.expenses(groupId), ctx.previous);
    },
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

export function useCreateSettlement(groupId: string) {
  const qc = useQueryClient();
  const mutation = useMutation<SettlementDto, Error, CreateSettlementVars, { previous?: GroupDetailDto }>({
    mutationKey: mutationKeys.createSettlement,
    onMutate: async ({ body }) => {
      // Move the balances on screen straight away.
      const previous = qc.getQueryData<GroupDetailDto>(keys.group(groupId));
      if (previous && body.currency === previous.currency) {
        const balances = { ...previous.balances };
        balances[body.fromMemberId] = (balances[body.fromMemberId] ?? 0) + body.amount;
        balances[body.toMemberId] = (balances[body.toMemberId] ?? 0) - body.amount;
        qc.setQueryData<GroupDetailDto>(keys.group(groupId), {
          ...previous,
          balances,
          myBalance: balances[previous.myMemberId] ?? 0,
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.group(groupId), ctx.previous);
    },
  });
  return {
    ...mutation,
    mutate: (body: CreateSettlementBody & { id: string }) => mutation.mutate({ groupId, body }),
  };
}

export function useSetSettlementDeleted(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      deleted ? api.settlements.remove(id) : api.settlements.restore(id),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

export function useRecurring(groupId: string | null) {
  return useQuery({
    queryKey: keys.recurring(groupId ?? ""),
    queryFn: () => api.recurring.list(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useCreateRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecurringBody) => api.recurring.create(groupId, { id: uuidv7(), ...body }),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

export function useStopRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.recurring.stop(id),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

export function useMemberActions(groupId: string) {
  const qc = useQueryClient();
  const done = () => invalidateGroup(qc, groupId);
  return {
    add: useMutation({ mutationFn: (displayName: string) => api.members.add(groupId, { displayName }), onSettled: done }),
    rename: useMutation({
      mutationFn: ({ memberId, displayName }: { memberId: string; displayName: string }) =>
        api.members.rename(groupId, memberId, displayName),
      onSettled: done,
    }),
    remove: useMutation({ mutationFn: (memberId: string) => api.members.remove(groupId, memberId), onSettled: done }),
  };
}

/** Sum of my balances per currency across groups (groups can differ in currency). */
export function totalsByCurrency(groups: GroupSummaryDto[] | undefined) {
  const totals = new Map<string, { owed: number; owe: number }>();
  for (const g of groups ?? []) {
    if (g.archived || g.myBalance === 0) continue;
    const t = totals.get(g.currency) ?? { owed: 0, owe: 0 };
    if (g.myBalance > 0) t.owed += g.myBalance;
    else t.owe += -g.myBalance;
    totals.set(g.currency, t);
  }
  return [...totals.entries()].map(([currency, t]) => ({ currency, ...t, net: t.owed - t.owe }));
}
