import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add";

const names = ["Ana", "Sam", "María José", "Dara"];

describe("parseQuickAdd", () => {
  it("reads the amount, the description and who shares it", () => {
    expect(parseQuickAdd("Dinner 45 with Sam", names)).toEqual({ description: "Dinner", amount: "45", people: ["Sam"] });
  });
  it("handles several people and decimals", () => {
    expect(parseQuickAdd("taxi €12.50 with sam and ana", names)).toEqual({ description: "Taxi", amount: "12.50", people: ["Sam", "Ana"] });
  });
  it("accepts a decimal comma and a leading symbol", () => {
    expect(parseQuickAdd("Pizza $24,5", names)?.amount).toBe("24.5");
  });
  it("works in other languages", () => {
    expect(parseQuickAdd("Cena 60 con Sam", names)).toEqual({ description: "Cena", amount: "60", people: ["Sam"] });
    expect(parseQuickAdd("Abendessen 30 mit Dara", names)?.people).toEqual(["Dara"]);
    expect(parseQuickAdd("खाना 200 Sam के साथ", names)).toEqual({ description: "खाना", amount: "200", people: ["Sam"] });
  });
  it("ignores accents and finds a name written without them", () => {
    expect(parseQuickAdd("Drinks 20 with maria jose", names)).toEqual({ description: "Drinks", amount: "20", people: ["María José"] });
    expect(parseQuickAdd("Drinks 20 with María", names)?.people).toEqual(["María José"]);
  });
  it("keeps words after the people list out of the names", () => {
    expect(parseQuickAdd("Dinner 45 with Sam at the market", names)).toEqual({ description: "Dinner at the market", amount: "45", people: ["Sam"] });
  });
  it("needs an amount", () => {
    expect(parseQuickAdd("Dinner with Sam", names)).toBeNull();
    expect(parseQuickAdd("Dinner", names)).toBeNull();
  });
});
