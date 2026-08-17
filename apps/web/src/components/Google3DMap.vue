<script setup lang="ts">
import type { Viewport } from "@bus-tracker/shared";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useVehicleStore } from "../stores/vehicles";
import { loadGoogleMaps } from "../map/google-loader";

const emit = defineEmits<{ viewport: [viewport: Viewport]; mapError: [message: string] }>();
const store = useVehicleStore();
const host = ref<HTMLDivElement>();
const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let map: Google3DElement | undefined;
let VehicleElement: (new (options: Record<string, unknown>) => Google3DElement) | undefined;
let HtmlMarker: (new (options: Record<string, unknown>) => Google3DElement) | undefined;
let usingModels = false;
let frame = 0;
let viewportTimer: number | undefined;
const markers = new Map<string, Google3DElement>();
const overlays = new Map<string, Google3DElement>();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderCount = computed(() => Math.min(store.vehicles.size, 300));

function reportViewport() {
  if (!map || !host.value) return;
  const center = map.center as { lat?: number; lng?: number } | undefined;
  const range = Number(map.range ?? 1_300_000);
  const lat = Number(center?.lat ?? 54.7);
  const lng = Number(center?.lng ?? -3);
  const latSpan = Math.min(13, Math.max(0.02, range / 90_000));
  const lonSpan = Math.min(15, latSpan * Math.max(1, host.value.clientWidth / Math.max(host.value.clientHeight, 1)));
  emit("viewport", { west: Math.max(-11.9, lng - lonSpan / 2), south: Math.max(48.1, lat - latSpan / 2), east: Math.min(3.9, lng + lonSpan / 2), north: Math.min(62.4, lat + latSpan / 2), zoom: Math.max(3, Math.min(20, 17 - Math.log2(range / 800))) });
}

function scheduleViewport() { window.clearTimeout(viewportTimer); viewportTimer = window.setTimeout(reportViewport, 400); }

function goToNottingham() {
  if (!map) return;
  map.center = { lat: 52.9534, lng: -1.1496, altitude: 0 };
  map.range = 3_200;
  map.tilt = 55;
  map.heading = 18;
  scheduleViewport();
}

defineExpose({ goToNottingham });

function syncMarkers() {
  if (!map || !VehicleElement) return;
  const visible = [...store.vehicles.values()].slice(0, 300);
  const ids = new Set(visible.map((vehicle) => vehicle.vehicleId));
  for (const [id, marker] of markers) if (!ids.has(id)) { marker.remove(); markers.delete(id); }
  for (const [id, marker] of overlays) if (!ids.has(id)) { marker.remove(); overlays.delete(id); }
  for (const vehicle of visible) {
    const existing = markers.get(vehicle.vehicleId);
    if (existing) {
      existing.position = { lat: vehicle.renderedLatitude, lng: vehicle.renderedLongitude, altitude: 0.4 };
      if (usingModels) existing.orientation = { heading: vehicle.bearing ?? 0, tilt: 0, roll: 0 };
    }
    else {
      const common = { position: { lat: vehicle.renderedLatitude, lng: vehicle.renderedLongitude, altitude: 0.4 }, title: `Route ${vehicle.routeName ?? "unknown"}` };
      const options = usingModels
        ? { ...common, src: `${location.origin}/models/generic-double-decker.glb`, orientation: { heading: vehicle.bearing ?? 0, tilt: 0, roll: 0 }, scale: 7, altitudeMode: "CLAMP_TO_GROUND" }
        : { ...common, label: vehicle.routeName ?? "Bus" };
      const created = new VehicleElement(options);
      created.addEventListener("gmp-click", () => store.select(vehicle.vehicleId));
      map.append(created);
      markers.set(vehicle.vehicleId, created);
    }
    if (HtmlMarker) {
      const overlay = overlays.get(vehicle.vehicleId);
      if (overlay) overlay.position = { lat: vehicle.renderedLatitude, lng: vehicle.renderedLongitude, altitude: 24 };
      else {
        const createdOverlay = new HtmlMarker({ position: { lat: vehicle.renderedLatitude, lng: vehicle.renderedLongitude, altitude: 24 }, altitudeMode: "RELATIVE_TO_GROUND", title: `Route ${vehicle.routeName ?? "Bus"}` });
        const icon = document.createElement("div");
        icon.className = "bus-map-icon";
        const route = document.createElement("strong");
        route.textContent = vehicle.routeName ?? "BUS";
        icon.append(route, document.createElement("i"), document.createElement("i"));
        createdOverlay.append(icon);
        createdOverlay.addEventListener("gmp-click", () => store.select(vehicle.vehicleId));
        map.append(createdOverlay);
        overlays.set(vehicle.vehicleId, createdOverlay);
      }
    }
  }
}

function animate(now: number) {
  if (!document.hidden) { store.animate(now); syncMarkers(); }
  const selected = store.selected;
  if (store.following && selected && map) {
    map.center = { lat: selected.renderedLatitude, lng: selected.renderedLongitude, altitude: 0 };
    map.heading = selected.bearing ?? map.heading ?? 0;
    map.range = Math.min(Number(map.range ?? 700), 700);
  }
  frame = requestAnimationFrame(animate);
}

onMounted(async () => {
  if (!key) { emit("mapError", "Add a Google Maps API key to start the 3D map."); return; }
  try {
    await loadGoogleMaps(key);
    const library = await window.google!.maps.importLibrary("maps3d");
    const Map3D = library.Map3DElement;
    usingModels = Boolean(library.Model3DInteractiveElement);
    VehicleElement = library.Model3DInteractiveElement ?? library.Marker3DInteractiveElement ?? library.Marker3DElement;
    HtmlMarker = library.MarkerInteractiveElement ?? library.MarkerElement;
    if (!Map3D || !VehicleElement) throw new Error("3D map support is unavailable");
    map = new Map3D({ center: { lat: 52.9534, lng: -1.1496, altitude: 0 }, range: 3_200, tilt: 58, heading: 18, mode: "HYBRID", gestureHandling: "GREEDY" });
    map.setAttribute("aria-label", "3D map of live UK buses");
    host.value?.append(map);
    for (const event of ["gmp-centerchange", "gmp-rangechange", "gmp-headingchange", "gmp-tiltchange"]) map.addEventListener(event, scheduleViewport);
    map.addEventListener("pointerdown", () => { if (store.following) store.following = false; });
    reportViewport();
    frame = requestAnimationFrame(animate);
  } catch (error) { emit("mapError", error instanceof Error ? error.message : "The 3D map could not be opened."); }
});

watch(() => store.vehicles, syncMarkers, { deep: false });
watch(() => store.selectedId, (id) => {
  for (const [markerId, marker] of markers) {
    if (usingModels) marker.scale = markerId === id ? 9 : 7;
    else marker.setAttribute("z-index", markerId === id ? "100" : "1");
  }
});

onBeforeUnmount(() => { cancelAnimationFrame(frame); window.clearTimeout(viewportTimer); for (const marker of markers.values()) marker.remove(); for (const marker of overlays.values()) marker.remove(); map?.remove(); });
</script>

<template>
  <div ref="host" class="map-host">
    <div class="map-counter" aria-live="polite"><strong>{{ renderCount }}</strong> buses in view</div>
    <button v-if="store.following" class="stop-follow" type="button" @click="store.following = false">Stop following</button>
    <span v-if="reducedMotion" class="motion-note">Reduced motion</span>
  </div>
</template>
