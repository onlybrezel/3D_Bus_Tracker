import type { StreamMessage, Viewport } from "@bus-tracker/shared";

export async function createSession(): Promise<string> {
  const response = await fetch("/api/v1/session", { method: "POST" });
  if (!response.ok) throw new Error("Could not start a live session");
  return (await response.json() as { sessionId: string }).sessionId;
}

export async function updateViewport(sessionId: string, viewport: Viewport): Promise<void> {
  const response = await fetch(`/api/v1/session/${sessionId}/viewport`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(viewport) });
  if (!response.ok) throw new Error("Could not update the map area");
}

export function openVehicleStream(sessionId: string, onMessage: (message: StreamMessage) => void, onState: (connected: boolean) => void): EventSource {
  const source = new EventSource(`/api/v1/session/${sessionId}/vehicles/stream`);
  source.onopen = () => onState(true);
  source.onerror = () => onState(false);
  for (const event of ["snapshot", "vehicle:add", "vehicle:update", "vehicle:remove", "provider:status"] as const) {
    source.addEventListener(event, (raw) => onMessage(JSON.parse((raw as MessageEvent<string>).data) as StreamMessage));
  }
  return source;
}
