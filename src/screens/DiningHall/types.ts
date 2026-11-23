export type StatusType = 'open' | 'soon' | 'closed';
// ponytail: 'Closest' removed — it was Math.random(); add back with expo-location + hall coords
export type SortOption = 'Relevance' | 'Open Now';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MenuItem {
  name: string;
  favorited?: boolean;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface MealMenu {
  count: number;
  categories: MenuCategory[];
}

export interface DiningHallDay {
  status: StatusType;
  hours: string;
  closedNote?: string;
  aiPickLabel?: string | null;
  aiPickName?: string | null;
  menus: Record<string, MealMenu>;  // ← changed from Record<MealType, ...> to Record<string, ...>
}

export interface DiningHall {
  id: string;
  name: string;
  emoji: string;
  emojiBg: string;
  mapsUrl: string;
  days: Record<string, DiningHallDay>;
}