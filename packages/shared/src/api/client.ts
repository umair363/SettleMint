import type {
  AddMemberBody,
  CreateExpenseBody,
  CreateGroupBody,
  CreateRecurringBody,
  CreateSettlementBody,
  JoinInviteBody,
  PaymentHandleInput,
  UpdateExpenseBody,
  UpdateGroupBody,
  UpdateMeBody,
  UpdateSettlementBody,
} from "./contracts";
import type {
  ActivityDto,
  ApiErrorBody,
  ApiErrorCode,
  ExpenseDto,
  GroupDetailDto,
  GroupSummaryDto,
  ImportResultDto,
  InvitePreviewDto,
  Me,
  MemberDto,
  Page,
  PaymentHandleDto,
  ReceiptScanDto,
  RecurringRuleDto,
  SearchResultDto,
  TrashItemDto,
  SettlementDto,
} from "./types";

export type ClientErrorCode = ApiErrorCode | "NETWORK";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The request never reached the server (offline, DNS, server asleep and timed out). */
  get isNetwork() {
    return this.code === "NETWORK";
  }
}

export interface ApiClientOptions {
  /** API origin, e.g. https://api.settlemint.online */
  baseUrl: string;
  fetch?: typeof fetch;
  /** Extra headers per request (mobile sends its session cookie this way, read from secure storage). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** "include" for browsers so the session cookie is sent cross-origin. */
  credentials?: "include" | "same-origin" | "omit";
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const doFetch = opts.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    let res: Response;
    try {
      const extra = (await opts.headers?.()) ?? {};
      res = await doFetch(`${base}/v1${path}${qs(query)}`, {
        method,
        credentials: opts.credentials ?? "include",
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...extra,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ApiError(0, "NETWORK", err instanceof Error ? err.message : "Network error");
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const e = (data as ApiErrorBody | undefined)?.error;
      throw new ApiError(res.status, e?.code ?? "INTERNAL", e?.message ?? `Request failed (${res.status})`, e?.details);
    }
    return data as T;
  }

  const get = <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query);
  const post = <T>(path: string, body: unknown = {}, query?: Query) => request<T>("POST", path, body, query);
  const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
  const del = <T>(path: string) => request<T>("DELETE", path);

  return {
    me: {
      get: () => get<Me>("/me"),
      update: (body: UpdateMeBody) => patch<Me>("/me", body),
      paymentHandles: () => get<PaymentHandleDto[]>("/me/payment-handles"),
      setPaymentHandles: (handles: PaymentHandleInput[]) =>
        request<PaymentHandleDto[]>("PUT", "/me/payment-handles", { handles }),
      /** Groups, expenses and payments deleted in the last 30 days. */
      trash: () => get<TrashItemDto[]>("/me/trash"),
      /** Everything involving me, as a JSON document. */
      export: () => get<unknown>("/me/export"),
      /** Permanently delete my account (my past expenses stay as a named placeholder). */
      delete: () => request<void>("DELETE", "/me", { confirm: "DELETE" }),
    },
    search: (q: string) => get<SearchResultDto>("/search", { q }),
    scanReceipt: (body: { image: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; currency?: string }) =>
      post<ReceiptScanDto>("/ai/receipt", body),
    importSplitwise: (body: { csv: string; groupName: string; meIndex: number }) =>
      post<ImportResultDto>("/import/splitwise", body),
    push: {
      /** The server's public VAPID key, or null when notifications are off. */
      key: () => get<{ publicKey: string | null }>("/push/key"),
      subscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
        request<void>("POST", "/push/subscribe", sub),
      unsubscribe: (endpoint: string) => request<void>("DELETE", "/push/subscribe", { endpoint }),
      /** A phone's Expo push token (the app sends it on every launch). */
      registerPhone: (token: string) => request<void>("POST", "/push/expo", { token }),
      unregisterPhone: (token: string) => request<void>("DELETE", "/push/expo", { token }),
    },
    groups: {
      list: () => get<GroupSummaryDto[]>("/groups"),
      get: (id: string) => get<GroupDetailDto>(`/groups/${id}`),
      create: (body: CreateGroupBody) => post<GroupDetailDto>("/groups", body),
      update: (id: string, body: UpdateGroupBody) => patch<GroupDetailDto>(`/groups/${id}`, body),
      remove: (id: string) => del<void>(`/groups/${id}`),
      restore: (id: string) => post<GroupDetailDto>(`/groups/${id}/restore`),
      leave: (id: string) => post<void>(`/groups/${id}/leave`),
      inviteLink: (id: string, rotate = false) =>
        post<{ token: string; url: string }>(`/groups/${id}/invite`, {}, rotate ? { rotate: true } : undefined),
    },
    members: {
      add: (groupId: string, body: AddMemberBody) => post<MemberDto[]>(`/groups/${groupId}/members`, body),
      rename: (groupId: string, memberId: string, displayName: string) =>
        patch<MemberDto[]>(`/groups/${groupId}/members/${memberId}`, { displayName }),
      remove: (groupId: string, memberId: string) => del<MemberDto[]>(`/groups/${groupId}/members/${memberId}`),
    },
    invites: {
      preview: (token: string) => get<InvitePreviewDto>(`/invites/${token}`),
      join: (token: string, body: JoinInviteBody = {}) => post<GroupDetailDto>(`/invites/${token}/join`, body),
    },
    expenses: {
      list: (groupId: string, query: { cursor?: string; limit?: number; includeDeleted?: boolean } = {}) =>
        get<Page<ExpenseDto>>(`/groups/${groupId}/expenses`, query),
      get: (id: string) => get<ExpenseDto>(`/expenses/${id}`),
      create: (groupId: string, body: CreateExpenseBody) => post<ExpenseDto>(`/groups/${groupId}/expenses`, body),
      update: (id: string, body: UpdateExpenseBody) => patch<ExpenseDto>(`/expenses/${id}`, body),
      remove: (id: string) => del<ExpenseDto>(`/expenses/${id}`),
      restore: (id: string) => post<ExpenseDto>(`/expenses/${id}/restore`),
    },
    settlements: {
      list: (groupId: string) => get<SettlementDto[]>(`/groups/${groupId}/settlements`),
      create: (groupId: string, body: CreateSettlementBody) =>
        post<SettlementDto>(`/groups/${groupId}/settlements`, body),
      update: (id: string, body: UpdateSettlementBody) => patch<SettlementDto>(`/settlements/${id}`, body),
      remove: (id: string) => del<SettlementDto>(`/settlements/${id}`),
      restore: (id: string) => post<SettlementDto>(`/settlements/${id}/restore`),
    },
    recurring: {
      list: (groupId: string) => get<RecurringRuleDto[]>(`/groups/${groupId}/recurring`),
      create: (groupId: string, body: CreateRecurringBody) => post<RecurringRuleDto>(`/groups/${groupId}/recurring`, body),
      stop: (id: string) => del<RecurringRuleDto>(`/recurring/${id}`),
    },
    activity: {
      all: (query: { cursor?: string; limit?: number } = {}) => get<Page<ActivityDto>>("/activity", query),
      group: (groupId: string, query: { cursor?: string; limit?: number; entityId?: string } = {}) =>
        get<Page<ActivityDto>>(`/groups/${groupId}/activity`, query),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
