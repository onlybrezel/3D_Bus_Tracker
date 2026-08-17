import type { VehiclePosition } from "@bus-tracker/shared";
import type { VehicleProvider } from "./provider.js";

const routes = [
  { routeName: "35", destination: "Bulwell", operatorName: "Nottingham City Transport", lat: 52.953, lon: -1.15 },
  { routeName: "34", destination: "University Park", operatorName: "Nottingham City Transport", lat: 52.956, lon: -1.17 },
  { routeName: "red arrow", destination: "Derby", operatorName: "trentbarton", lat: 52.948, lon: -1.143 }
] as const;

export class MockVehicleProvider implements VehicleProvider {
  readonly name = "mock";
  async fetchVehicles(): Promise<VehiclePosition[]> {
    const now = Date.now();
    return Array.from({ length: 36 }, (_, index) => {
      const route = routes[index % routes.length]!;
      const angle = now / 80_000 + index * 0.73;
      const latitude = route.lat + Math.sin(angle) * (0.008 + (index % 5) * 0.001);
      const longitude = route.lon + Math.cos(angle) * (0.012 + (index % 4) * 0.002);
      return {
        vehicleId: `mock:nottingham-${index + 1}`,
        latitude,
        longitude,
        recordedAt: new Date(now).toISOString(),
        receivedAt: new Date().toISOString(),
        bearing: (angle * 180 / Math.PI + 90) % 360,
        routeName: route.routeName,
        destination: route.destination,
        operatorName: route.operatorName,
        fleetNumber: String(400 + index),
        source: "mock"
      };
    });
  }
}
