import type { VehiclePosition } from "@bus-tracker/shared";
import { z } from "zod";
import { config } from "../config.js";
import type { VehicleProvider } from "./provider.js";

const recordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  vehicle_id: z.union([z.string(), z.number()]).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  datetime: z.string().optional(),
  recorded_at: z.string().optional(),
  bearing: z.coerce.number().min(0).max(360).optional(),
  route_name: z.string().optional(),
  destination: z.string().optional(),
  operator_name: z.string().optional(),
  reg: z.string().optional(),
  fleet_code: z.string().optional()
}).passthrough();

export class BustimesVehicleProvider implements VehicleProvider {
  readonly name = "bustimes";
  async fetchVehicles(): Promise<VehiclePosition[]> {
    if (!config.BUSTIMES_VEHICLES_URL) throw new Error("BUSTIMES_VEHICLES_URL is required");
    const url = new URL(config.BUSTIMES_VEHICLES_URL);
    url.searchParams.set("minlat", String(config.BUS_FEED_MIN_LAT));
    url.searchParams.set("maxlat", String(config.BUS_FEED_MAX_LAT));
    url.searchParams.set("minlon", String(config.BUS_FEED_MIN_LON));
    url.searchParams.set("maxlon", String(config.BUS_FEED_MAX_LON));
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "3d-bus-tracker/0.1" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Bustimes responded with ${response.status}`);
    const raw: unknown = await response.json();
    const records = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && "vehicles" in raw && Array.isArray(raw.vehicles) ? raw.vehicles : [];
    const receivedAt = new Date().toISOString();
    return records.flatMap((candidate): VehiclePosition[] => {
      const parsed = recordSchema.safeParse(candidate);
      if (!parsed.success) return [];
      const value = parsed.data;
      const rawId = value.vehicle_id ?? value.id;
      const latitude = value.latitude ?? value.lat;
      const longitude = value.longitude ?? value.lon;
      if (rawId === undefined || latitude === undefined || longitude === undefined) return [];
      const vehicle: VehiclePosition = {
        vehicleId: `bustimes:${String(rawId)}`,
        latitude,
        longitude,
        recordedAt: value.recorded_at ?? value.datetime ?? receivedAt,
        receivedAt,
        source: "bustimes"
      };
      if (value.bearing !== undefined) vehicle.bearing = value.bearing;
      if (value.route_name !== undefined) vehicle.routeName = value.route_name;
      if (value.destination !== undefined) vehicle.destination = value.destination;
      if (value.operator_name !== undefined) vehicle.operatorName = value.operator_name;
      if (value.reg !== undefined) vehicle.vehicleRegistration = value.reg;
      if (value.fleet_code !== undefined) vehicle.fleetNumber = value.fleet_code;
      return [vehicle];
    });
  }
}
