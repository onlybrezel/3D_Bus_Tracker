let loading: Promise<void> | undefined;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const callback = `__busScopeMapsReady${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callback] = () => { delete (window as unknown as Record<string, unknown>)[callback]; resolve(); };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=maps3d&callback=${callback}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps could not be loaded"));
    document.head.append(script);
  });
  return loading;
}
