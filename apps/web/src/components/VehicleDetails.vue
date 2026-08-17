<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useVehicleStore } from "../stores/vehicles";
const store = useVehicleStore();
const now = ref(Date.now());
let timer = 0;
onMounted(() => { timer = window.setInterval(() => now.value = Date.now(), 1000); });
onBeforeUnmount(() => clearInterval(timer));
const age = computed(() => store.selected ? Math.max(0, Math.round((now.value - Date.parse(store.selected.receivedAt)) / 1000)) : 0);
</script>

<template>
  <aside v-if="store.selected" class="details-card" aria-label="Selected bus">
    <button class="close-button" type="button" aria-label="Close bus details" @click="store.select()">×</button>
    <div class="eyebrow">Selected bus</div>
    <div class="route-line"><span class="route-badge">{{ store.selected.routeName ?? "Bus" }}</span><h2>{{ store.selected.destination ?? "Live vehicle" }}</h2></div>
    <dl>
      <template v-if="store.selected.operatorName"><dt>Operator</dt><dd>{{ store.selected.operatorName }}</dd></template>
      <template v-if="store.selected.vehicleRegistration"><dt>Registration</dt><dd>{{ store.selected.vehicleRegistration }}</dd></template>
      <template v-if="store.selected.fleetNumber"><dt>Fleet number</dt><dd>{{ store.selected.fleetNumber }}</dd></template>
      <dt>Last update</dt><dd>{{ age < 2 ? "just now" : `${age}s ago` }}</dd>
    </dl>
    <button class="primary-button" type="button" @click="store.following = !store.following">{{ store.following ? "Stop following" : "Follow bus" }}</button>
  </aside>
</template>
