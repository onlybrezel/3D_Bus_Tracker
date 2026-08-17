import type { VehiclePosition } from "@bus-tracker/shared";

export interface VehicleProvider {
  readonly name: string;
  fetchVehicles(): Promise<VehiclePosition[]>;
}
