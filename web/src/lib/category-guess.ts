// Guess a category from what someone typed, so "Dinner" or "Uber" get the
// right icon without an extra tap. Only used until the person picks one.

const RULES: [string, RegExp][] = [
  ["food", /\b(dinner|lunch|breakfast|brunch|meal|restaurant|cafe|café|coffee|pizza|burger|sushi|bar|drinks?|beer|wine|food|takeaway|snacks?|kfc|mcdonald|starbucks|dessert|ice cream)\b/i],
  ["groceries", /\b(grocer(y|ies)|supermarket|market|walmart|tesco|aldi|lidl|carrefour|costco|milk|bread|veggies)\b/i],
  ["transport", /\b(taxi|uber|lyft|careem|bolt|cab|bus|train|metro|subway|tram|fuel|petrol|gas|diesel|parking|toll|flight|flights|airline|ferry|car rental|rental car|ticket to)\b/i],
  ["accommodation", /\b(hotel|airbnb|hostel|motel|booking|lodge|resort|stay|accommodation)\b/i],
  ["bills", /\b(rent|electric(ity)?|water|internet|wifi|wi-fi|phone|mobile|utilit(y|ies)|bill|gas bill|netflix|spotify|subscription|insurance)\b/i],
  ["entertainment", /\b(movie|cinema|film|concert|tickets?|museum|show|game|bowling|club|party|festival|tour|park)\b/i],
  ["health", /\b(pharmacy|doctor|hospital|medicine|clinic|dentist|gym)\b/i],
  ["shopping", /\b(shopping|clothes|shoes|amazon|gift|gifts|souvenirs?|ikea|furniture)\b/i],
];

export function guessCategory(description: string): string | null {
  const text = description.trim();
  if (text.length < 3) return null;
  for (const [id, re] of RULES) if (re.test(text)) return id;
  return null;
}
