import pino from "pino";
import { config } from "./config.js";
import { BustimesVehicleProvider } from "./providers/bustimes.js";
import { MockVehicleProvider } from "./providers/mock.js";

const log = pino({ level: config.LOG_LEVEL });
const provider = config.VEHICLE_SOURCE === "bustimes" ? new BustimesVehicleProvider() : new MockVehicleProvider();
let stopped = false;
let failures = 0;
process.once("SIGTERM", () => { stopped = true; });
process.once("SIGINT", () => { stopped = true; });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deliver = async (vehicles: Awaited<ReturnType<typeof provider.fetchVehicles>>, fetchedAt: string, durationMs: number) => {
  const response = await fetch(`${config.API_INTERNAL_URL}/internal/ingestion/snapshot`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.INGESTION_TOKEN}` },
    body: JSON.stringify({ provider: provider.name, fetchedAt, durationMs, vehicles }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`API rejected snapshot with ${response.status}`);
};

while (!stopped) {
  const started = Date.now();
  try {
    const vehicles = await provider.fetchVehicles();
    const durationMs = Date.now() - started;
    await deliver(vehicles, new Date().toISOString(), durationMs);
    log.info({ provider: provider.name, vehicles: vehicles.length, durationMs }, "vehicle feed refreshed");
    failures = 0;
  } catch (error) {
    failures += 1;
    log.error({ provider: provider.name, error, failures }, "vehicle feed refresh failed");
  }
  const backoff = failures === 0 ? config.VEHICLE_POLL_INTERVAL_MS : Math.min(60_000, 5_000 * 2 ** Math.min(failures - 1, 4));
  await sleep(backoff + Math.floor(Math.random() * 750));
}
