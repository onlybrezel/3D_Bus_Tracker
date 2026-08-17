export type VehicleSource = "bustimes" | "bods" | "mock" | "other";

export interface VehiclePosition {
  vehicleId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  receivedAt: string;
  bearing?: number;
  speedMps?: number;
  routeId?: string;
  routeName?: string;
  destination?: string;
  operatorId?: string;
  operatorName?: string;
  tripId?: string;
  vehicleRegistration?: string;
  fleetNumber?: string;
  source: VehicleSource;
}

export interface Viewport {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}

export type StreamMessage =
  | { protocol: 1; type: "snapshot"; data: { vehicles: VehiclePosition[] } }
  | { protocol: 1; type: "vehicle:add" | "vehicle:update"; data: VehiclePosition }
  | { protocol: 1; type: "vehicle:remove"; data: { vehicleId: string } }
  | { protocol: 1; type: "provider:status"; data: ProviderStatus };

export interface ProviderStatus {
  provider: string;
  state: "starting" | "live" | "degraded";
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastVehicleCount: number;
  lastFetchDurationMs?: number;
}
