import { describe, expect, it } from "vitest";
import { bearingDegrees, contains, distanceMeters, interpolate } from "./index.js";

describe("geo helpers", () => {
  it("calculates an eastward bearing", () => expect(bearingDegrees({ latitude: 52, longitude: -1 }, { latitude: 52, longitude: 0 })).toBeCloseTo(89.6, 0));
  it("calculates short distances", () => expect(distanceMeters({ latitude: 52, longitude: 0 }, { latitude: 52.001, longitude: 0 })).toBeCloseTo(111, 0));
  it("clamps interpolation", () => expect(interpolate({ latitude: 0, longitude: 0 }, { latitude: 10, longitude: 20 }, 2)).toEqual({ latitude: 10, longitude: 20 }));
  it("checks bounds", () => expect(contains({ west: -2, south: 51, east: 0, north: 53 }, { latitude: 52, longitude: -1 })).toBe(true));
});
