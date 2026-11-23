import { describe, expect, it } from "vitest";
import type { ActivityDto } from "@settlemint/shared";
import { describeActivity, type ActivityT } from "./activity-text";

// A tiny stand-in for the translator: "{name} added {item}".
const t = ((key: string, v: Record<string, string> = {}) =>
  key === "expenseAdded" ? `${v.name} added ${v.item}` : key === "someone" ? "Someone" : key) as unknown as ActivityT;

const event = (over: Partial<ActivityDto> = {}) =>
  ({ type: "expense.created", actorName: "Ana", actorUserId: "u1", data: { description: "Dinner", amount: 100, currency: "EUR" }, ...over }) as ActivityDto;

describe("describeActivity", () => {
  it("keeps the plain sentence free of markers", () => {
    expect(describeActivity(event(), "u2", t).text).toBe("Ana added Dinner");
  });
  it("splits names and items out so they can be shown bold", () => {
    expect(describeActivity(event(), "u2", t).parts).toEqual([
      { text: "Ana", strong: true },
      { text: " added ", strong: false },
      { text: "Dinner", strong: true },
    ]);
  });
});
