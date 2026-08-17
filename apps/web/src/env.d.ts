/// <reference types="vite/client" />

interface ImportMetaEnv { readonly VITE_GOOGLE_MAPS_API_KEY?: string; readonly VITE_RENDER_DELAY_MS?: string }
interface ImportMeta { readonly env: ImportMetaEnv }

interface Google3DElement extends HTMLElement {
  center?: { lat?: number; lng?: number; altitude?: number };
  range?: number;
  heading?: number;
  tilt?: number;
  position?: { lat: number; lng: number; altitude?: number };
  orientation?: { heading?: number; tilt?: number; roll?: number };
  scale?: number;
}

interface Window {
  google?: {
    maps: { importLibrary(name: "maps3d"): Promise<Record<string, new (options: Record<string, unknown>) => Google3DElement>> }
  };
}
