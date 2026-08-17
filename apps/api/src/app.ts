import Fastify, { type FastifyReply } from "fastify";
import rateLimit from "@fastify/rate-limit";
import mariadb from "mariadb";
import { contains, padBounds } from "@bus-tracker/geo";
import type { ProviderStatus, StreamMessage, VehiclePosition } from "@bus-tracker/shared";
import { z } from "zod";
import { config } from "./config.js";
import { VehicleRegistry, type RegistryDelta } from "./registry.js";
import { SessionStore } from "./sessions.js";

const viewportSchema = z.object({
  west: z.number().min(-12).max(4),
  south: z.number().min(48).max(62.5),
  east: z.number().min(-12).max(4),
  north: z.number().min(48).max(62.5),
  zoom: z.number().min(3).max(24)
}).refine((v) => v.north > v.south, "north must be greater than south")
  .refine((v) => Math.abs(v.north - v.south) <= 14, "viewport is too large");

const ingestionSchema = z.object({
  provider: z.string(),
  fetchedAt: z.iso.datetime(),
  durationMs: z.number().nonnegative(),
  vehicles: z.array(z.custom<VehiclePosition>()).max(100_000)
});

interface Client { sessionId: string; reply: FastifyReply; visible: Set<string> }

export function buildApp() {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const registry = new VehicleRegistry();
  const sessions = new SessionStore();
  const clients = new Set<Client>();
  const pool = mariadb.createPool({ host: config.MARIADB_HOST, port: config.MARIADB_PORT, database: config.MARIADB_DATABASE, user: config.MARIADB_USER, password: config.MARIADB_PASSWORD, connectionLimit: 4 });
  const status: ProviderStatus = { provider: config.VEHICLE_SOURCE, state: "starting", lastVehicleCount: 0 };

  const send = (client: Client, message: StreamMessage, event = message.type) => {
    client.reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(message)}\n\n`);
  };

  const broadcast = (delta: RegistryDelta) => {
    for (const client of clients) {
      const viewport = sessions.getViewport(client.sessionId);
      if (!viewport) continue;
      const bounds = padBounds(viewport);
      for (const vehicle of [...delta.added, ...delta.updated]) {
        const inside = contains(bounds, vehicle);
        const wasVisible = client.visible.has(vehicle.vehicleId);
        if (inside) {
          send(client, { protocol: 1, type: wasVisible ? "vehicle:update" : "vehicle:add", data: vehicle });
          client.visible.add(vehicle.vehicleId);
        } else if (wasVisible) {
          send(client, { protocol: 1, type: "vehicle:remove", data: { vehicleId: vehicle.vehicleId } });
          client.visible.delete(vehicle.vehicleId);
        }
      }
      for (const vehicleId of delta.removed) if (client.visible.delete(vehicleId)) send(client, { protocol: 1, type: "vehicle:remove", data: { vehicleId } });
    }
  };

  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.get("/api/v1/health", async () => ({ status: "ok" }));
  app.get("/api/v1/ready", async (_request, reply) => {
    try { const connection = await pool.getConnection(); await connection.ping(); connection.release(); return { status: "ready", ingestionInitialized: status.state !== "starting" }; }
    catch { return reply.code(503).send({ status: "not_ready" }); }
  });
  app.get("/api/v1/status", async () => ({ ...status, vehiclesTracked: registry.size }));
  app.post("/api/v1/session", async (_request, reply) => reply.code(201).send({ sessionId: sessions.create() }));
  app.put("/api/v1/session/:id/viewport", { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    if (!sessions.has(id)) return reply.code(404).send({ error: "Session not found" });
    const result = viewportSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Invalid UK viewport", details: result.error.issues });
    sessions.setViewport(id, result.data);
    const vehicles = registry.inViewport(result.data);
    for (const client of clients) if (client.sessionId === id) {
      client.visible = new Set(vehicles.map((vehicle) => vehicle.vehicleId));
      send(client, { protocol: 1, type: "snapshot", data: { vehicles } }, "snapshot");
    }
    return reply.code(204).send();
  });
  app.get("/api/v1/session/:id/vehicles/stream", async (request, reply) => {
    const sessionId = (request.params as { id: string }).id;
    if (!sessions.has(sessionId)) return reply.code(404).send({ error: "Session not found" });
    const viewport = sessions.getViewport(sessionId);
    if (!viewport) return reply.code(409).send({ error: "Set a viewport before connecting" });
    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    const initialVehicles = registry.inViewport(viewport);
    const client = { sessionId, reply, visible: new Set(initialVehicles.map((vehicle) => vehicle.vehicleId)) };
    clients.add(client);
    send(client, { protocol: 1, type: "snapshot", data: { vehicles: initialVehicles } }, "snapshot");
    const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 20_000);
    request.raw.on("close", () => { clearInterval(heartbeat); clients.delete(client); });
  });
  app.get("/api/v1/vehicles/:id", async (request, reply) => {
    const vehicle = registry.get(decodeURIComponent((request.params as { id: string }).id));
    return vehicle ?? reply.code(404).send({ error: "Vehicle not found" });
  });
  app.post("/internal/ingestion/snapshot", { bodyLimit: 32 * 1024 * 1024 }, async (request, reply) => {
    if (request.headers.authorization !== `Bearer ${config.INGESTION_TOKEN}`) return reply.code(401).send({ error: "Unauthorized" });
    const result = ingestionSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Invalid snapshot" });
    status.provider = result.data.provider;
    status.state = "live";
    status.lastAttemptAt = result.data.fetchedAt;
    status.lastSuccessAt = result.data.fetchedAt;
    status.lastVehicleCount = result.data.vehicles.length;
    status.lastFetchDurationMs = result.data.durationMs;
    delete status.lastError;
    const delta = registry.apply(result.data.vehicles, Date.now(), config.VEHICLE_REMOVE_MS);
    broadcast(delta);
    return { accepted: result.data.vehicles.length, delta: { added: delta.added.length, updated: delta.updated.length, removed: delta.removed.length } };
  });

  app.addHook("onClose", async () => { for (const client of clients) client.reply.raw.end(); await pool.end(); });
  return app;
}
