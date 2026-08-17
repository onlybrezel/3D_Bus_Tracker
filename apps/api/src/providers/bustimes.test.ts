import { describe, expect, it } from "vitest";
import { normalizeBustimesVehicles } from "./bustimes.js";

describe("bustimes normalization", () => {
  it("normalizes the public vehicles.json contract", () => {
    const vehicles = normalizeBustimesVehicles([{
      id: 1,
      coordinates: [-3.177108, 51.4771385],
      heading: 96,
      datetime: "2026-08-17T15:22:45+01:00",
      destination: "Llanedeyrn",
      trip_id: 645279203,
      service_id: 76788,
      service: { url: "/services/58-city-centre", line_name: "58" },
      vehicle: { url: "/vehicles/cbus-141", name: "141 - CN11 KFZ", colour: "#ff9900" }
    }], "2026-08-17T14:23:00Z");

    expect(vehicles).toEqual([expect.objectContaining({
      vehicleId: "bustimes:cbus-141",
      latitude: 51.4771385,
      longitude: -3.177108,
      bearing: 96,
      routeId: "76788",
      routeName: "58",
      destination: "Llanedeyrn",
      tripId: "645279203",
      fleetNumber: "141",
      vehicleRegistration: "CN11 KFZ",
      source: "bustimes"
    })]);
  });

  it("skips malformed records", () => {
    expect(normalizeBustimesVehicles([{ id: 1 }, { coordinates: [0, 52] }])).toEqual([]);
  });
});
