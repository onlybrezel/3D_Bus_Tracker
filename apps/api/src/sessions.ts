import type { Viewport } from "@bus-tracker/shared";
import { randomUUID } from "node:crypto";

export class SessionStore {
  private readonly sessions = new Map<string, { viewport?: Viewport; expiresAt: number }>();
  create(): string { const id = randomUUID(); this.sessions.set(id, { expiresAt: Date.now() + 86_400_000 }); return id; }
  has(id: string): boolean { return (this.sessions.get(id)?.expiresAt ?? 0) > Date.now(); }
  setViewport(id: string, viewport: Viewport): boolean { const session = this.sessions.get(id); if (!session) return false; session.viewport = viewport; session.expiresAt = Date.now() + 86_400_000; return true; }
  getViewport(id: string): Viewport | undefined { return this.sessions.get(id)?.viewport; }
}
