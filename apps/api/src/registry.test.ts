import { describe, expect, it } from "vitest";
import type { VehiclePosition } from "@bus-tracker/shared";
import { VehicleRegistry } from "./registry.js";

const vehicle = (id: string, latitude = 52.95, recordedAt = "2026-08-17T08:00:00Z"): VehiclePosition => ({ vehicleId: id, latitude, longitude: -1.15, recordedAt, receivedAt: recordedAt, source: "mock" });

describe("VehicleRegistry", () => {
  it("adds, updates and filters vehicles", () => {
    const registry = new VehicleRegistry();
    expect(registry.apply([vehicle("one")]).added).toHaveLength(1);
    expect(registry.apply([vehicle("one", 52.96, "2026-08-17T08:00:15Z")]).updated).toHaveLength(1);
    expect(registry.inViewport({ west: -1.2, east: -1.1, south: 52.9, north: 53, zoom: 14 })).toHaveLength(1);
  });
  it("ignores out-of-order observations", () => {
    const registry = new VehicleRegistry();
    registry.apply([vehicle("one", 52.96, "2026-08-17T08:00:15Z")]);
    registry.apply([vehicle("one", 50, "2026-08-17T08:00:00Z")]);
    expect(registry.get("one")?.latitude).toBe(52.96);
  });
});
