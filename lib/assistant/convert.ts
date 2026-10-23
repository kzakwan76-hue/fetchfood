import type { RestaurantWithMenu } from "../catalog";
import type { AssistantAnswer, AssistantItem } from "./types";

/** Turns the catalog (restaurants with menus) into the flat list the assistant works with. */
export function toAssistantItems(restaurants: RestaurantWithMenu[]): AssistantItem[] {
  return restaurants.flatMap((restaurant) =>
    restaurant.items.map((item) => ({
      itemId: item.id,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      pricePkr: item.pricePkr,
      tags: item.tags ?? [],
      // The catalog only exposes whether the restaurant is open.
      canOrderNow: restaurant.isOpen,
    })),
  );
}

/** What the browser receives for one recommended dish. Every value comes from our menu data. */
export type PublicPick = {
  itemId: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  description: string;
  category: string;
  pricePkr: number;
  reason: string;
};

export type PublicAnswer = {
  source: "ai" | "rules";
  reply: string;
  picks: PublicPick[];
};

export function toPublicAnswer(answer: AssistantAnswer): PublicAnswer {
  return {
    source: answer.source,
    reply: answer.reply,
    picks: answer.picks.map(({ item, reason }) => ({
      itemId: item.itemId,
      restaurantId: item.restaurantId,
      restaurantSlug: item.restaurantSlug,
      restaurantName: item.restaurantName,
      name: item.name,
      description: item.description,
      category: item.category,
      pricePkr: item.pricePkr,
      reason,
    })),
  };
}