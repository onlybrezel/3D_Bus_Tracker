import type { VehiclePosition } from "@bus-tracker/shared";
import { z } from "zod";
import { config } from "../config.js";
import type { VehicleProvider } from "./provider.js";

const recordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  coordinates: z.tuple([
    z.coerce.number().min(-180).max(180),
    z.coerce.number().min(-90).max(90)
  ]).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  datetime: z.string().optional(),
  destination: z.string().nullable().optional(),
  trip_id: z.union([z.string(), z.number()]).optional(),
  service_id: z.union([z.string(), z.number()]).optional(),
  service: z.object({
    url: z.string().optional(),
    line_name: z.string().optional()
  }).nullable().optional(),
  vehicle: z.object({
    url: z.string().optional(),
    name: z.string().optional(),
    colour: z.string().optional()
  }).nullable().optional()
}).passthrough();

function vehicleIdentity(record: z.infer<typeof recordSchema>): string | undefined {
  const pathId = record.vehicle?.url?.split("/").filter(Boolean).at(-1);
  const id = pathId ?? record.id;
  return id === undefined ? undefined : `bustimes:${String(id)}`;
}

function vehicleNameParts(name?: string): { fleetNumber?: string; registration?: string } {
  if (!name) return {};
  const [fleetNumber, registration] = name.split(/\s+-\s+/, 2);
  if (!registration) return { registration: name };
  return fleetNumber ? { fleetNumber, registration } : { registration };
}

export function normalizeBustimesVehicles(raw: unknown, receivedAt = new Date().toISOString()): VehiclePosition[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((candidate): VehiclePosition[] => {
    const parsed = recordSchema.safeParse(candidate);
    if (!parsed.success) return [];
    const value = parsed.data;
    const coordinates = value.coordinates;
    if (!coordinates) return [];
    const vehicleId = vehicleIdentity(value);
    if (!vehicleId) return [];
    const [longitude, latitude] = coordinates;
    const name = vehicleNameParts(value.vehicle?.name);
    const vehicle: VehiclePosition = {
      vehicleId,
      latitude,
      longitude,
      recordedAt: value.datetime ?? receivedAt,
      receivedAt,
      source: "bustimes"
    };
    if (value.heading !== undefined) vehicle.bearing = value.heading;
    if (value.service_id !== undefined) vehicle.routeId = String(value.service_id);
    if (value.service?.line_name) vehicle.routeName = value.service.line_name;
    if (value.destination) vehicle.destination = value.destination;
    if (value.trip_id !== undefined) vehicle.tripId = String(value.trip_id);
    if (name.fleetNumber) vehicle.fleetNumber = name.fleetNumber;
    if (name.registration) vehicle.vehicleRegistration = name.registration;
    return [vehicle];
  });
}

export class BustimesVehicleProvider implements VehicleProvider {
  readonly name = "bustimes";

  async fetchVehicles(): Promise<VehiclePosition[]> {
    const url = new URL(config.BUSTIMES_VEHICLES_URL);
    url.searchParams.set("ymin", String(config.BUS_FEED_MIN_LAT));
    url.searchParams.set("ymax", String(config.BUS_FEED_MAX_LAT));
    url.searchParams.set("xmin", String(config.BUS_FEED_MIN_LON));
    url.searchParams.set("xmax", String(config.BUS_FEED_MAX_LON));
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "3d-bus-tracker/0.1" },
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`Bustimes responded with ${response.status}`);
    return normalizeBustimesVehicles(await response.json());
  }
}
