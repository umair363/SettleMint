"use client";

import type { ExpenseDto } from "@settlemint/shared";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface OpenOptions {
  /** Pre-select a group (when adding from inside a group). */
  groupId?: string;
  /** Edit an existing expense instead of creating one. */
  expense?: ExpenseDto;
}

interface AddExpenseContextValue {
  open: boolean;
  options: OpenOptions;
  /** Changes on every open, so the form starts fresh each time. */
  session: number;
  openAddExpense: (opts?: OpenOptions) => void;
  close: () => void;
}

const Ctx = createContext<AddExpenseContextValue | null>(null);

export function AddExpenseProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OpenOptions>({});
  const [session, setSession] = useState(0);
  const openAddExpense = useCallback((opts: OpenOptions = {}) => {
    setOptions(opts);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, options, session, openAddExpense, close }),
    [open, options, session, openAddExpense, close],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAddExpense() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAddExpense must be used inside AddExpenseProvider");
  return ctx;
}
