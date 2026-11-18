// What a group or an expense is, as a drawn glyph instead of an emoji.
// One meaning, three names: Phosphor on the web, SF Symbols on iOS,
// Material Symbols on Android (and the phone app's web preview).

export interface GlyphNames {
  web: string;
  ios: string;
  md: string;
}

export const GROUP_GLYPHS: Record<string, GlyphNames> = {
  trip: { web: "AirplaneTilt", ios: "airplane", md: "flight" },
  home: { web: "HouseSimple", ios: "house.fill", md: "home" },
  couple: { web: "Heart", ios: "heart.fill", md: "favorite" },
  event: { web: "Confetti", ios: "party.popper.fill", md: "celebration" },
  other: { web: "UsersThree", ios: "person.3.fill", md: "groups" },
  direct: { web: "Handshake", ios: "person.2.fill", md: "handshake" },
};

export const CATEGORY_GLYPHS: Record<string, GlyphNames> = {
  food: { web: "ForkKnife", ios: "fork.knife", md: "restaurant" },
  transport: { web: "Car", ios: "car.fill", md: "directions_car" },
  accommodation: { web: "Bed", ios: "bed.double.fill", md: "hotel" },
  entertainment: { web: "FilmSlate", ios: "film", md: "movie" },
  shopping: { web: "ShoppingBag", ios: "bag.fill", md: "shopping_bag" },
  bills: { web: "Lightning", ios: "bolt.fill", md: "bolt" },
  groceries: { web: "Basket", ios: "basket.fill", md: "shopping_basket" },
  health: { web: "FirstAidKit", ios: "cross.case.fill", md: "medical_services" },
  other: { web: "Tag", ios: "tag.fill", md: "sell" },
};

export const groupGlyph = (type: string | null | undefined): GlyphNames => GROUP_GLYPHS[type ?? "other"] ?? GROUP_GLYPHS.other;
export const categoryGlyph = (id: string | null | undefined): GlyphNames =>
  CATEGORY_GLYPHS[(id ?? "other").toLowerCase()] ?? CATEGORY_GLYPHS.other;
