import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MARIADB_HOST: z.string().default("localhost"),
  MARIADB_PORT: z.coerce.number().int().default(3306),
  MARIADB_DATABASE: z.string().default("bus_tracker"),
  MARIADB_USER: z.string().default("bus_tracker"),
  MARIADB_PASSWORD: z.string().default("bus_tracker"),
  VEHICLE_SOURCE: z.enum(["mock", "bustimes"]).default("mock"),
  VEHICLE_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(15000),
  BUSTIMES_VEHICLES_URL: z.string().optional(),
  BUS_FEED_MIN_LAT: z.coerce.number().default(49.5),
  BUS_FEED_MAX_LAT: z.coerce.number().default(61.2),
  BUS_FEED_MIN_LON: z.coerce.number().default(-8.7),
  BUS_FEED_MAX_LON: z.coerce.number().default(2.2),
  VEHICLE_REMOVE_MS: z.coerce.number().int().default(180000),
  INGESTION_TOKEN: z.string().min(12).default("local-development-token"),
  API_INTERNAL_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.string().default("info")
});

export const config = envSchema.parse(process.env);
