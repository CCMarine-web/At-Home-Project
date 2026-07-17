export const PSIX_SERVICE_TYPES = ["Tank Barge", "Freight Barge", "Towing Vessel"] as const;
export type PsixServiceType = (typeof PSIX_SERVICE_TYPES)[number];

export interface PsixVesselSummaryRow {
  VesselId: string;
  VesselName?: string;
  VesselCallSign?: string;
  ServiceType?: string;
  ConstructionCompletedYear?: string;
  StatusLookupName?: string;
  Identification?: string;
  ManufacturerHullNumber?: string;
  CountryLookupName?: string;
}

export interface PsixVesselParticularsRow {
  VesselName?: string;
  VesselCallSign?: string;
  CountryLookupName?: string;
  ServiceType?: string;
  ServiceSubType?: string;
  CargoAuthorizationDescription?: string;
  ConstructionCompletedYear?: string;
  StatusLookupName?: string;
  OutOfServiceDate?: string;
  VIN?: string;
  IdentificationTypeLookupName?: string;
}

export interface PsixVesselDocumentRow {
  VesselID?: string;
  TypeLookupName?: string;
  IssueDtTm?: string;
  ExpiredDtTm?: string;
  OrganizationAbbr?: string;
  Number?: string;
}
