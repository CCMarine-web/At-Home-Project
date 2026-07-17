export type VesselType = "tank_barge" | "hopper_barge" | "towboat" | "tugboat";

export interface Vessel {
  id: string;
  name: string;
  type: VesselType;
  serviceSubType: string;
  buildYear: number | null;
  coiIssueDate: string | null;
  coiExpirationDate: string | null;
  grossTons: number | null;
  horsepower: number | null;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  accessType: "live_programmatic" | "periodic_snapshot" | "unavailable";
  refreshCadence: string;
  lastSuccessfulPull: string | null;
  fieldsProvided: string[];
  knownLimitations: string[];
}
