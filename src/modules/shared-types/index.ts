/**
 * Tipe lintas modul — definisi TUNGGAL (IMPLEMENTATION-PLAN §3.0).
 * Modul lain wajib mengimpor dari sini, tidak mendefinisikan ulang.
 */

export type ConditionStatus = "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK";
export type DataQualityStatus = "AVAILABLE" | "DATA_UNAVAILABLE";
export type DistributionStatus = "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI";
export type CustodyStage = 0 | 1 | 2; // PABRIK | DISTRIBUTOR | RETAILER
export type HandlingMode = "COLD_CHAIN" | "NON_COLD_CHAIN";
export type ParameterCode = "TEMPERATURE" | "HUMIDITY" | "SHOCK_LEVEL" | "DOOR_OPEN_DURATION";

export const CUSTODY_STAGE_LABEL: Record<CustodyStage, string> = {
  0: "Pabrik",
  1: "Distributor",
  2: "Retailer",
};
