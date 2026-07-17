// Categorical slots from the validated reference palette (dataviz skill),
// assigned in a fixed order per vessel type — never reassigned by filtering.
export const VESSEL_TYPE_COLOR: Record<string, string> = {
  tank_barge: "#2a78d6", // blue (slot 1)
  hopper_barge: "#008300", // green (slot 2)
  towboat: "#eb6834", // orange (slot 6)
  tugboat: "#4a3aa7", // violet (slot 7)
};

export const VESSEL_TYPE_LABEL: Record<string, string> = {
  tank_barge: "Tank Barges",
  hopper_barge: "Hopper Barges",
  towboat: "Towboats",
  tugboat: "Tugboats",
};

export const STATUS_COLOR = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#fcfcfb",
};
