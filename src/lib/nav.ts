export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/drydocking", label: "Drydocking" },
  { href: "/towboats", label: "Towboats" },
  { href: "/tugboats", label: "Tugboats" },
  { href: "/hopper-barges", label: "Hopper Barges" },
  { href: "/deck-barges", label: "Deck Barges" },
  { href: "/market-insights", label: "Market Insights" },
  { href: "/data-sources", label: "Data Sources" },
];
