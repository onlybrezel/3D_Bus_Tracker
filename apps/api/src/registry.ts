import { bearingDegrees, contains, distanceMeters, padBounds } from "@bus-tracker/geo";
import type { VehiclePosition, Viewport } from "@bus-tracker/shared";

export interface RegistryDelta { added: VehiclePosition[]; updated: VehiclePosition[]; removed: string[] }

export class VehicleRegistry {
  private readonly vehicles = new Map<string, VehiclePosition>();
  apply(incoming: VehiclePosition[], now = Date.now(), removeAfterMs = 180_000): RegistryDelta {
    const added: VehiclePosition[] = [];
    const updated: VehiclePosition[] = [];
    const seen = new Set<string>();
    for (const candidate of incoming) {
      seen.add(candidate.vehicleId);
      const previous = this.vehicles.get(candidate.vehicleId);
      if (previous && Date.parse(candidate.recordedAt) < Date.parse(previous.recordedAt)) continue;
      const next = { ...candidate };
      if (previous && next.bearing === undefined) {
        const distance = distanceMeters(previous, next);
        if (distance >= 4) next.bearing = bearingDegrees(previous, next);
        else if (previous.bearing !== undefined) next.bearing = previous.bearing;
      }
      this.vehicles.set(next.vehicleId, next);
      if (previous) updated.push(next); else added.push(next);
    }
    const removed: string[] = [];
    for (const [id, vehicle] of this.vehicles) {
      if (!seen.has(id) && now - Date.parse(vehicle.receivedAt) > removeAfterMs) {
        this.vehicles.delete(id);
        removed.push(id);
      }
    }
    return { added, updated, removed };
  }
  inViewport(viewport: Viewport): VehiclePosition[] {
    const bounds = padBounds(viewport);
    return [...this.vehicles.values()].filter((vehicle) => contains(bounds, vehicle));
  }
  get(id: string): VehiclePosition | undefined { return this.vehicles.get(id); }
  get size(): number { return this.vehicles.size; }
}
