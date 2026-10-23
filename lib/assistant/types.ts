/**
 * Shapes used by the FetchFood assistant.
 * AssistantItem is OUR OWN shape: a later step converts database rows into it,
 * so the assistant logic never depends on exact table columns.
 */
export type AssistantItem = {
  itemId: string; // real database id. The AI model never sees this.
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  description: string;
  category: string;
  pricePkr: number; // whole rupees
  tags: string[]; // e.g. "spicy", "vegetarian". NOT allergy information.
  canOrderNow: boolean; // restaurant is open AND the item is available
};

export type Recommendation = {
  item: AssistantItem; // always a real item from the menu data
  reason: string;
};

export type AssistantAnswer = {
  source: "ai" | "rules";
  reply: string;
  picks: Recommendation[];
};