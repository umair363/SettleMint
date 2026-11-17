// Guess a category from what someone typed, so "Dinner", "cena" or "عشاء" get
// the right icon without an extra tap. Only used until the person picks one.

const WORDS: [string, string[]][] = [
  // Groceries before food, so "supermarket" doesn't read as a meal.
  [
    "groceries",
    [
      "grocery", "groceries", "supermarket", "market", "walmart", "tesco", "aldi", "lidl", "carrefour", "costco", "milk", "bread", "veggies",
      "supermercado", "mercado", "mercadona", "feira", "courses", "supermarché", "marché", "einkauf", "supermarkt", "lebensmittel",
      "किराना", "सब्ज़ी", "सब्जी", "سودا", "سبزی", "کریانہ", "بقالة", "سوبرماركت", "خضار",
    ],
  ],
  [
    "food",
    [
      "dinner", "lunch", "breakfast", "brunch", "meal", "restaurant", "cafe", "café", "coffee", "pizza", "burger", "sushi", "bar", "drink", "drinks",
      "beer", "wine", "food", "takeaway", "snack", "snacks", "kfc", "mcdonald", "mcdonalds", "starbucks", "dessert", "ice cream",
      "cena", "comida", "almuerzo", "desayuno", "restaurante", "cerveza", "vino", "tapas", "bebidas",
      "jantar", "almoço", "lanche", "cerveja", "vinho",
      "dîner", "déjeuner", "repas", "resto", "bière", "vin", "boissons",
      "abendessen", "mittagessen", "frühstück", "essen", "bier", "wein", "getränke", "imbiss",
      "खाना", "डिनर", "लंच", "नाश्ता", "रेस्टोरेंट", "चाय", "कॉफ़ी",
      "کھانا", "ڈنر", "لنچ", "ناشتہ", "ریسٹورنٹ", "چائے", "بریانی",
      "عشاء", "غداء", "فطور", "مطعم", "قهوة", "طعام", "شاي",
    ],
  ],
  [
    "transport",
    [
      "taxi", "uber", "lyft", "careem", "bolt", "cab", "bus", "train", "metro", "subway", "tram", "fuel", "petrol", "gas", "diesel", "parking", "toll",
      "flight", "flights", "airline", "ferry", "car rental", "rental car",
      "gasolina", "autobús", "tren", "vuelo", "peaje", "aparcamiento", "táxi", "ônibus", "trem", "voo", "pedágio", "estacionamento",
      "essence", "vol", "péage", "benzin", "tanken", "zug", "bahn", "flug", "maut", "parken",
      "टैक्सी", "ऑटो", "पेट्रोल", "बस", "ट्रेन", "फ़्लाइट",
      "ٹیکسی", "رکشہ", "پیٹرول", "ٹرین", "فلائٹ", "بس",
      "تاكسي", "أجرة", "بنزين", "حافلة", "قطار", "طيران",
    ],
  ],
  [
    "accommodation",
    [
      "hotel", "airbnb", "hostel", "motel", "booking", "lodge", "resort", "stay", "accommodation",
      "alojamiento", "hostal", "hospedagem", "pousada", "hôtel", "logement", "gîte", "unterkunft", "ferienwohnung",
      "होटल", "ہوٹل", "فندق", "سكن",
    ],
  ],
  [
    "bills",
    [
      "rent", "electric", "electricity", "water", "internet", "wifi", "wi-fi", "phone", "mobile", "utility", "utilities", "bill", "gas bill",
      "netflix", "spotify", "subscription", "insurance",
      "alquiler", "luz", "agua", "factura", "aluguel", "água", "loyer", "électricité", "eau", "facture", "miete", "strom", "wasser", "rechnung", "nebenkosten",
      "किराया", "बिजली", "पानी", "बिल", "کرایہ", "بجلی", "پانی", "بل", "إيجار", "كهرباء", "فاتورة",
    ],
  ],
  [
    "entertainment",
    [
      "movie", "cinema", "film", "concert", "ticket", "tickets", "museum", "show", "game", "bowling", "club", "party", "festival", "tour", "park",
      "cine", "entradas", "concierto", "fiesta", "ingressos", "festa", "cinéma", "billets", "fête", "kino", "konzert",
      "फ़िल्म", "सिनेमा", "पार्टी", "فلم", "سینما", "پارٹی", "سينما", "حفلة", "تذاكر",
    ],
  ],
  [
    "health",
    [
      "pharmacy", "doctor", "hospital", "medicine", "clinic", "dentist", "gym",
      "farmacia", "médico", "farmácia", "pharmacie", "médecin", "apotheke", "arzt",
      "दवा", "डॉक्टर", "دوائی", "ڈاکٹر", "صيدلية", "دواء", "طبيب",
    ],
  ],
  [
    "shopping",
    [
      "shopping", "clothes", "shoes", "amazon", "gift", "gifts", "souvenir", "souvenirs", "ikea", "furniture",
      "ropa", "regalo", "compras", "roupa", "presente", "vêtements", "cadeau", "kleidung", "geschenk",
      "कपड़े", "तोहफ़ा", "शॉपिंग", "کپڑے", "تحفہ", "شاپنگ", "ملابس", "هدية", "تسوق",
    ],
  ],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const latin = (w: string) => /^[\p{Script=Latin}\d\s-]+$/u.test(w);

// Latin-script words must stand alone ("bar" not in "barber"); Arabic, Urdu and
// Hindi words may carry prefixes and suffixes ("العشاء"), so they match anywhere.
const RULES: [string, RegExp][] = WORDS.map(([id, words]) => {
  const bounded = words.filter(latin).map((w) => `(?<!\\p{L})${escape(w)}(?!\\p{L})`);
  const loose = words.filter((w) => !latin(w)).map(escape);
  return [id, new RegExp([...bounded, ...loose].join("|"), "iu")];
});

export function guessCategory(description: string): string | null {
  const text = description.trim();
  if (text.length < 2) return null;
  for (const [id, re] of RULES) if (re.test(text)) return id;
  return null;
}
