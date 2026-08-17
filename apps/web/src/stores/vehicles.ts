import { interpolate, distanceMeters } from "@bus-tracker/geo";
import type { StreamMessage, VehiclePosition } from "@bus-tracker/shared";
import { defineStore } from "pinia";
import { computed, ref, shallowRef, triggerRef } from "vue";

export interface RenderVehicle extends VehiclePosition {
  previousLatitude: number;
  previousLongitude: number;
  renderedLatitude: number;
  renderedLongitude: number;
  interpolationStartedAt: number;
  interpolationEndsAt: number;
}

const renderDelay = Number(import.meta.env.VITE_RENDER_DELAY_MS ?? 5000);

export const useVehicleStore = defineStore("vehicles", () => {
  const vehicles = shallowRef(new Map<string, RenderVehicle>());
  const selectedId = ref<string>();
  const following = ref(false);
  const connected = ref(false);
  const selected = computed(() => selectedId.value ? vehicles.value.get(selectedId.value) : undefined);

  function upsert(next: VehiclePosition) {
    const old = vehicles.value.get(next.vehicleId);
    const now = performance.now();
    const jumped = old ? distanceMeters(old, next) > 675 : false;
    vehicles.value.set(next.vehicleId, {
      ...next,
      previousLatitude: old && !jumped ? old.renderedLatitude : next.latitude,
      previousLongitude: old && !jumped ? old.renderedLongitude : next.longitude,
      renderedLatitude: old && !jumped ? old.renderedLatitude : next.latitude,
      renderedLongitude: old && !jumped ? old.renderedLongitude : next.longitude,
      interpolationStartedAt: now,
      interpolationEndsAt: now + renderDelay
    });
    triggerRef(vehicles);
  }

  function receive(message: StreamMessage) {
    if (message.type === "snapshot") {
      vehicles.value = new Map();
      for (const vehicle of message.data.vehicles) upsert(vehicle);
    } else if (message.type === "vehicle:add" || message.type === "vehicle:update") upsert(message.data);
    else if (message.type === "vehicle:remove") {
      vehicles.value.delete(message.data.vehicleId);
      if (selectedId.value === message.data.vehicleId) { selectedId.value = undefined; following.value = false; }
      triggerRef(vehicles);
    }
  }

  function animate(now: number) {
    for (const vehicle of vehicles.value.values()) {
      const progress = (now - vehicle.interpolationStartedAt) / Math.max(1, vehicle.interpolationEndsAt - vehicle.interpolationStartedAt);
      const point = interpolate({ latitude: vehicle.previousLatitude, longitude: vehicle.previousLongitude }, vehicle, progress);
      vehicle.renderedLatitude = point.latitude;
      vehicle.renderedLongitude = point.longitude;
    }
    triggerRef(vehicles);
  }

  function select(id?: string) { selectedId.value = id; if (!id) following.value = false; }
  return { vehicles, selectedId, selected, following, connected, receive, animate, select };
});
