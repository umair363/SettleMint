// Map Splitwise categories (and, failing that, the description) onto ours.
const RULES: [string, RegExp][] = [
  ["food", /dining|restaurant|food|drink|liquor|coffee|meal|dinner|lunch|breakfast|bar\b/i],
  ["groceries", /grocer|supermarket/i],
  ["transport", /taxi|uber|car|bus|train|fuel|gas\b|parking|plane|flight|transport|bicycle|travel/i],
  ["accommodation", /hotel|airbnb|hostel|lodging|accommodation/i],
  ["bills", /rent|mortgage|electric|water|heat|internet|phone|tv|utilities|bill|insurance|cleaning|maintenance|household/i],
  ["entertainment", /entertainment|movie|game|music|sport|ticket|concert/i],
  ["health", /medical|health|pharma|doctor|gym/i],
  ["shopping", /clothing|gift|electronic|furniture|shopping|pets/i],
];

export function guessImportCategory(category: string, description: string): string {
  for (const text of [category, description]) {
    for (const [id, re] of RULES) if (re.test(text)) return id;
  }
  return "other";
}
