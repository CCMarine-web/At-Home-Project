// Categorical slots from the validated reference palette (dataviz skill),
// assigned in a fixed order per vessel type — never reassigned by filtering.
// Categorical slots brightened for legibility on the dark (slate-900/950) surface.
export const VESSEL_TYPE_COLOR: Record<string, string> = {
  tank_barge: "#4ea3f0", // blue (slot 1)
  hopper_barge: "#34c759", // green (slot 2)
  towboat: "#f5844a", // orange (slot 6)
  tugboat: "#9a86f0", // violet (slot 7)
};

export const VESSEL_TYPE_LABEL: Record<string, string> = {
  tank_barge: "Tank Barges",
  hopper_barge: "Hopper Barges",
  towboat: "Towboats",
  tugboat: "Tugboats",
};

// Categorical cycle for multi-slice charts (donuts, multi-series lines) on the
// dark surface. First four match the vessel-type slots so shared categories
// keep their colors across charts.
export const CHART_CATEGORICAL = [
  "#4ea3f0", // blue
  "#34c759", // green
  "#f5844a", // orange
  "#9a86f0", // violet
  "#e8c547", // gold
  "#5bc8c4", // teal
  "#ef7fb1", // pink
  "#94a3b8", // slate (used for "Other")
];

export const STATUS_COLOR = {
  good: "#22c55e",
  warning: "#fbbf24",
  serious: "#f0916a",
  critical: "#ef4444",
};

// Chart ink flipped for a dark surface: light text/marks, dim grid/axis lines.
export const CHART_INK = {
  primary: "#f1f5f9",
  secondary: "#cbd5e1",
  muted: "#94a3b8",
  grid: "#334155",
  axis: "#475569",
  surface: "#0f172a",
};
