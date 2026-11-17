import { describe, expect, it } from "vitest";
import { guessCategory } from "./category-guess";

describe("guessCategory", () => {
  it.each([
    ["Dinner at Nando's", "food"],
    ["Cena con amigos", "food"],
    ["jantar", "food"],
    ["Abendessen", "food"],
    ["العشاء", "food"],
    ["عشاء", "food"],
    ["کھانا", "food"],
    ["डिनर", "food"],
    ["Uber to the airport", "transport"],
    ["Gasolina", "transport"],
    ["ٹیکسی", "transport"],
    ["supermercado", "groceries"],
    ["Hotel Lisboa", "accommodation"],
    ["Miete November", "bills"],
    ["بجلی کا بل", "bills"],
    ["Kino", "entertainment"],
    ["farmácia", "health"],
  ])("%s → %s", (text, id) => {
    expect(guessCategory(text)).toBe(id);
  });

  it("doesn't match words inside other Latin words", () => {
    expect(guessCategory("Barber")).toBeNull(); // not "bar"
    expect(guessCategory("Vinyl records")).toBeNull(); // not "vin"
  });
});
