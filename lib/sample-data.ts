export type MenuItem = {
  id: string;
  name: string;
  description: string;
  pricePkr: number; // whole rupees
  category: string;
  tags: string[]; // e.g. "spicy", "vegetarian" (for the chatbot in M6; NOT allergy info)
};

export type Restaurant = {
  slug: string;
  name: string;
  cuisine: string;
  area: string;
  etaMinutes: number;
  deliveryFeePkr: number;
  minOrderPkr: number;
  isOpen: boolean;
  items: MenuItem[];
};

export const restaurants: Restaurant[] = [
  {
    slug: "karahi-house",
    name: "Karahi House",
    cuisine: "Pakistani",
    area: "Sample Area A",
    etaMinutes: 40,
    deliveryFeePkr: 150,
    minOrderPkr: 800,
    isOpen: true,
    items: [
      { id: "kh-1", name: "Chicken Karahi (half)", description: "Tomato, ginger and green chilli.", pricePkr: 1450, category: "Mains", tags: ["spicy"] },
      { id: "kh-2", name: "Daal Mash", description: "Slow-cooked white lentils.", pricePkr: 450, category: "Mains", tags: ["vegetarian"] },
      { id: "kh-3", name: "Naan", description: "Fresh from the tandoor.", pricePkr: 40, category: "Sides", tags: ["vegetarian"] },
      { id: "kh-4", name: "Sweet Lassi", description: "Thick and chilled.", pricePkr: 220, category: "Drinks", tags: ["vegetarian"] },
    ],
  },
  {
    slug: "burger-lab",
    name: "Burger Lab",
    cuisine: "Fast food",
    area: "Sample Area B",
    etaMinutes: 30,
    deliveryFeePkr: 120,
    minOrderPkr: 600,
    isOpen: true,
    items: [
      { id: "bl-1", name: "Zinger Burger", description: "Crispy chicken, mayo, lettuce.", pricePkr: 550, category: "Burgers", tags: ["spicy"] },
      { id: "bl-2", name: "Beef Smash Burger", description: "Double patty, cheese, pickles.", pricePkr: 750, category: "Burgers", tags: [] },
      { id: "bl-3", name: "Fries", description: "Salted, regular size.", pricePkr: 250, category: "Sides", tags: ["vegetarian"] },
      { id: "bl-4", name: "Cola", description: "345 ml can.", pricePkr: 120, category: "Drinks", tags: ["vegetarian"] },
    ],
  },
  {
    slug: "biryani-junction",
    name: "Biryani Junction",
    cuisine: "Biryani",
    area: "Sample Area A",
    etaMinutes: 45,
    deliveryFeePkr: 150,
    minOrderPkr: 500,
    isOpen: true,
    items: [
      { id: "bj-1", name: "Chicken Biryani", description: "Single plate with raita.", pricePkr: 450, category: "Rice", tags: ["spicy"] },
      { id: "bj-2", name: "Beef Pulao", description: "Mild, fragrant stock rice.", pricePkr: 500, category: "Rice", tags: [] },
      { id: "bj-3", name: "Raita", description: "Yoghurt with cucumber.", pricePkr: 80, category: "Sides", tags: ["vegetarian"] },
      { id: "bj-4", name: "Zarda", description: "Sweet rice dessert.", pricePkr: 200, category: "Dessert", tags: ["vegetarian"] },
    ],
  },
  {
    slug: "desi-dhaba",
    name: "Desi Dhaba",
    cuisine: "Pakistani",
    area: "Sample Area C",
    etaMinutes: 50,
    deliveryFeePkr: 200,
    minOrderPkr: 1000,
    isOpen: false,
    items: [
      { id: "dd-1", name: "Chicken Handi", description: "Creamy, mildly spiced.", pricePkr: 1300, category: "Mains", tags: [] },
      { id: "dd-2", name: "Paratha", description: "Layered and buttery.", pricePkr: 100, category: "Sides", tags: ["vegetarian"] },
    ],
  },
];

export function getRestaurant(slug: string): Restaurant | undefined {
  return restaurants.find((r) => r.slug === slug);
}