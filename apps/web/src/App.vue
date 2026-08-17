<script setup lang="ts">
import type { ProviderStatus, Viewport } from "@bus-tracker/shared";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createSession, openVehicleStream, updateViewport } from "./api/client";
import Google3DMap from "./components/Google3DMap.vue";
import VehicleDetails from "./components/VehicleDetails.vue";
import { useVehicleStore } from "./stores/vehicles";

const store = useVehicleStore();
const sessionId = ref<string>();
const mapError = ref<string>();
const appError = ref<string>();
const provider = ref<ProviderStatus>();
const map = ref<InstanceType<typeof Google3DMap>>();
let source: EventSource | undefined;
let statusTimer = 0;
let pendingViewport: Viewport | undefined;

async function setViewport(viewport: Viewport) {
  pendingViewport = viewport;
  if (!sessionId.value) return;
  try { await updateViewport(sessionId.value, viewport); }
  catch (error) { appError.value = error instanceof Error ? error.message : "Live buses are unavailable."; }
}

async function refreshStatus() {
  try { const response = await fetch("/api/v1/status"); if (response.ok) provider.value = await response.json() as ProviderStatus; } catch { /* status remains unchanged */ }
}

onMounted(async () => {
  try {
    sessionId.value = await createSession();
    if (pendingViewport) await updateViewport(sessionId.value, pendingViewport);
    else await updateViewport(sessionId.value, { west: -1.3, south: 52.85, east: -0.95, north: 53.05, zoom: 13 });
    source = openVehicleStream(sessionId.value, store.receive, (connected) => store.connected = connected);
    await refreshStatus(); statusTimer = window.setInterval(refreshStatus, 15_000);
  } catch (error) { appError.value = error instanceof Error ? error.message : "Live buses are unavailable."; }
});

onBeforeUnmount(() => { source?.close(); clearInterval(statusTimer); });
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="BusScope UK home"><span class="brand-mark"><i></i><i></i></span><span>BusScope <b>UK</b></span></a>
      <div class="topbar-actions">
        <div class="live-status" :class="{ online: store.connected }"><span></span><div><strong>{{ store.connected ? "Live" : "Connecting" }}</strong><small>{{ provider?.lastVehicleCount ?? 0 }} tracked</small></div></div>
        <button class="icon-button" type="button" aria-label="About live bus data">i</button>
      </div>
    </header>
    <section class="map-stage">
      <Google3DMap ref="map" @viewport="setViewport" @map-error="mapError = $event" />
      <div class="intro-card">
        <p class="eyebrow">Nottingham · demo feed</p>
        <h1>Watch the city<br /><em>move.</em></h1>
        <p>Thirty-six demo buses are moving around Nottingham.</p>
        <button class="demo-button" type="button" @click="map?.goToNottingham()">Show demo buses</button>
        <div class="hint"><span>↕</span> Drag, tilt and select a bus</div>
      </div>
      <div v-if="mapError" class="map-message"><strong>Map key needed</strong><span>{{ mapError }}</span></div>
      <div v-if="appError" class="data-warning">{{ appError }}</div>
      <VehicleDetails />
      <div class="map-credit">Bus locations: configured provider · Map data © Google</div>
    </section>
  </main>
</template>
