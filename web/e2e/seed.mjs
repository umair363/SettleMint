// Realistic demo data for screenshots and design reviews: one person (Ana)
// with a trip, a shared flat and a one-to-one balance.
// Usage from another script: `await seed(context, apiUrl, origin)`.

const today = new Date();
const daysAgo = (n) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);

/** Signs up Ana in `context` (cookies stay in it) and fills her account. Returns ids for deep links. */
export async function seed(context, API, ORIGIN, email = `ana-${Date.now()}@example.com`) {
  const call = async (method, url, data) => {
    const res = await context.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };

  await call("POST", "/v1/auth/sign-up/email", {
    name: "Ana Souza",
    email,
    password: "correct-horse-battery",
  });
  await call("PATCH", "/v1/me", { defaultCurrency: "EUR" });

  // Lisbon trip: 4 people, euros, a week of shared costs.
  const trip = await call("POST", "/v1/groups", {
    name: "Lisbon trip",
    currency: "EUR",
    type: "trip",
    people: [{ displayName: "Bilal" }, { displayName: "Chen" }, { displayName: "Dara" }],
  });
  const m = Object.fromEntries(trip.members.map((x) => [x.displayName, x.id]));
  const me = trip.myMemberId;
  const everyone = [me, m.Bilal, m.Chen, m.Dara];
  const tripExpenses = [
    ["Apartment in Alfama", 64000, "accommodation", me, 6],
    ["Airport taxi", 3800, "transport", m.Bilal, 6],
    ["Dinner at Taberna", 11240, "food", me, 5],
    ["Pastéis de Belém", 1680, "food", m.Chen, 5],
    ["Tram 28 tickets", 1200, "transport", m.Dara, 4],
    ["Groceries", 4615, "groceries", m.Bilal, 4],
    ["Fado night", 9600, "entertainment", me, 3],
    ["Sintra day trip", 15200, "transport", m.Chen, 2],
    ["Sunset drinks", 3450, "food", m.Dara, 1],
  ];
  for (const [description, amount, category, payer, ago] of tripExpenses) {
    await call("POST", `/v1/groups/${trip.id}/expenses`, {
      description,
      amount,
      currency: "EUR",
      category,
      date: daysAgo(ago),
      payers: [{ memberId: payer, amount }],
      split: { method: "equal", memberIds: everyone },
    });
  }
  await call("POST", `/v1/groups/${trip.id}/settlements`, {
    fromMemberId: m.Dara,
    toMemberId: me,
    amount: 5000,
    currency: "EUR",
    date: daysAgo(1),
  });

  // Flat 3B: rent and bills in pounds.
  const flat = await call("POST", "/v1/groups", {
    name: "Flat 3B",
    currency: "GBP",
    type: "home",
    people: [{ displayName: "Priya" }, { displayName: "Tom" }],
  });
  const f = Object.fromEntries(flat.members.map((x) => [x.displayName, x.id]));
  const flatmates = [flat.myMemberId, f.Priya, f.Tom];
  for (const [description, amount, category, payer, ago] of [
    ["Rent, November", 240000, "bills", f.Priya, 12],
    ["Electricity", 9620, "bills", flat.myMemberId, 8],
    ["Broadband", 3500, "bills", f.Tom, 7],
    ["Cleaning supplies", 2310, "groceries", flat.myMemberId, 3],
  ]) {
    await call("POST", `/v1/groups/${flat.id}/expenses`, {
      description,
      amount,
      currency: "GBP",
      category,
      date: daysAgo(ago),
      payers: [{ memberId: payer, amount }],
      split: { method: "equal", memberIds: flatmates },
    });
  }

  // Just Sam and me.
  const sam = await call("POST", "/v1/groups", {
    name: "Sam",
    currency: "EUR",
    type: "direct",
    people: [{ displayName: "Sam" }],
  });
  const samId = sam.members.find((x) => !x.isMe).id;
  await call("POST", `/v1/groups/${sam.id}/expenses`, {
    description: "Concert tickets",
    amount: 13000,
    currency: "EUR",
    category: "entertainment",
    date: daysAgo(2),
    payers: [{ memberId: samId, amount: 13000 }],
    split: { method: "equal", memberIds: [sam.myMemberId, samId] },
  });

  return { tripId: trip.id, flatId: flat.id, samId: sam.id };
}

// Run directly to create a demo account for a design review:
//   node e2e/seed.mjs demo@settlemint.test http://localhost:3001 http://localhost:8001
if (process.argv[1]?.endsWith("seed.mjs")) {
  const [email, origin = "http://localhost:3001", api = "http://localhost:8001"] = process.argv.slice(2);
  if (email) {
    const { createRequire } = await import("node:module");
    const { request } = createRequire(import.meta.url)("playwright");
    const ctx = await request.newContext();
    await seed({ request: ctx }, api, origin, email);
    await ctx.dispose();
    console.log(`Seeded ${email} (password: correct-horse-battery)`);
  }
}
